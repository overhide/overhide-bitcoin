"use strict";

const fetch = require('node-fetch');
const debug = require('./log.js').debug_fn("btc-addrs-chain");

// private attribtues
const ctx = Symbol('context');
const metrics = Symbol('metrics');

// private functions
const checkInit = Symbol('checkInit');

/**
 * Wires up functionality we use throughout.
 * 
 * Module returns this class as object all wired-up.  Before you can use the methods you must "init" the object 
 * somewhere at process start.
 * 
 * Leverages node's module system for a sort of context & dependency injection, so order of requiring and initializing
 * these sorts of libraries matters.
 */
class BtcAddrsChain {
  constructor() {
    this[ctx] = null;
  }

  // ensure this is initialized
  [checkInit]() {
    if (! this[ctx]) throw new Error('library not initialized, call "init" when wiring up app first');
  }

  /**
   * Initialize this library: this must be the first method called somewhere from where you're doing context & dependency
   * injection.
   * 
   * @param {string} btc_network - which network are we using
   * @return {BtcAddrsChain} this
   */
   init({btc_network} = {}) {
    if (btc_network == null) throw new Error("NETWORK_TYPE must be specified.");

    this[ctx] = {
      btc_network: btc_network
    };
    this[metrics] = {
      errors: 0,
      errorsLastCheck: 0,
      errorsDelta: 0,
      txlistForAddressHits: 0
    };

    return this;
  }

  /**
   * @param {string} address - an bitcoin network address (e.g. `tb1qtxnlwnctxjnvv0xn78rulsfyrlcwnxwadvzwh7`)

   * @returns {Promise<Object[]>} an array of transactions: [{block:.., from:..,to:..,value:..,time:.., hash:..},..] where 'from' is the payee 
   *   address, 'to' is the recepient, 'value' is the amount of Wei, and 'time' is the transaction write unix time 
   *   in seconds.
   * 
   * @throws {Error} if problem
   */
  async getTransactionsForAddress(address) {
    this[checkInit]();

    try {
      var txs = []
      let beforeClause = ``;
      for(;;) {
        const url = `https://api.blockcypher.com/v1/btc/${this[ctx].btc_network}/addrs/${address}/full${beforeClause}`;
        let response = await fetch(url, {
          method: 'GET', headers: {
            'Content-Type': 'text/plain',
            'Accept': 'application/json'
          }
        });
        if (response.status != 200) {
          let text = await response.text();
          throw `GET ${url} code: ${response.status} error: ${text}`;
        }
        response = await response.json();
        const theseTxs = response.txs
        .filter(t => t.inputs.length === 1 && 'addresses' in t.inputs[0] && t.inputs[0].addresses.length === 1)
        .filter(t => !!t.block_height && !!t.block_hash)
        .flatMap(t => t.outputs
          .filter(o => o.addresses.length === 1 && o.addresses[0] == address)
          .map(o => {
            return {
              block: t.block_height,
              from: t.inputs[0].addresses[0],
              to: o.addresses[0],
              value: o.value,
              time: new Date(t.received),
              bkhash: t.block_hash,
              txhash: t.hash
            };
          }));
        txs = [...txs,...theseTxs];
        if (!('hasMore' in response)) break;
        debug(`more results from for ${address}, fetching more`);
        beforeClause = `?before=${Math.min(txs.map(t => t.block))}`;
      }
      
      txs = txs.map(r => {
        return {
          block: r.blockNumber,
          from: r.from,
          to: r.to,
          bkhash: r.blockHash,
          txhash: r.txhash,
          value: r.value,
          time: new Date(+r.timeStamp * 1000)
        };
      });
    } catch (err) {
      this[metrics].errors++;
      throw err;
    }

    if (!txs) throw new Error(`no result for ${address}`);
    this[metrics].txlistForAddressHits++;
    return txs;
  }

  /**
   * @returns {{errors:.., errorsDelta:..}} metrics object.
   */
   metrics() {
    this[checkInit]();
    this[metrics].errorsDelta = this[metrics].errors - this[metrics].errorsLastCheck;
    this[metrics].errorsLastCheck = this[metrics].errors;
    return this[metrics];
  }
}

module.exports = (new BtcAddrsChain());