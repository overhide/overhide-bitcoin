"use strict";

const crypto = require('crypto')
const fetch = require('node-fetch');
const log = require('./log.js').fn("btc-chain");
const database = require('../lib/database.js');
const bitcoinMessage = require('bitcoinjs-message')
const Bitcoin = require('bitcoinjs-lib');

const ENCODING = 'utf-8';
const HASH_ALGO = 'sha256';
const DIGEST_FORMAT = 'hex';

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
class BtcChain {
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
   * @param {boolean} isProd - are we in PROD?
   * @return {BtcChain} this
   */
  init({isProd} = {}) {
    this[ctx] = {
      isProd: isProd,
      apiPrefix: isProd ? '' : '/testnet'
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
   * @returns {number} latest block number.
   */
  async getLatestBlock() {
    this[checkInit]();
    try {
      const url = `https://blockstream.info${this[ctx].apiPrefix}/api/blocks/tip/height`;
      let response = await fetch(url, {
        method: 'GET', headers: {
          'Content-Type': 'text/plain',
          'Accept': 'text/plain'
        }
      });
      if (response.status != 200) {
        let text = await response.text();
        throw `GET ${url} code: ${response.status} error: ${text}`;
      }
      response = await response.text();      
      return response;  
    } catch (err) {
      this[metrics].errors++;
      throw err;
    }
  }

  /**
   * @param {number} block -- block number
   * @returns {number} hash of the block
   */
   async getHashOfBlock(block) {
    this[checkInit]();
    try {
      const url = `https://blockstream.info${this[ctx].apiPrefix}/api/block-height/${block}`;
      let response = await fetch(url, {
        method: 'GET', headers: {
          'Content-Type': 'text/plain',
          'Accept': 'text/plain'
        }
      });
      if (response.status != 200) {
        let text = await response.text();
        throw `GET ${url} code: ${response.status} error: ${text}`;
      }
      response = await response.text();      
      return response;  
    } catch (err) {
      this[metrics].errors++;
      throw err;
    }
  }

  /**
   * @param {*} script -- to extract address out of
   * @returns {string} the address
   */
  getAddressFromScript(script) {
    for(const type of Object.keys(Bitcoin.payments)) {
      try {
        const address = Bitcoin.payments[type]({output: script, network: this[ctx].isProd ? Bitcoin.networks.bitcoin : Bitcoin.networks.testnet}).address
        if (!address) continue;
        return address;
      } catch(e) {}
    }    
    return null;
  }

  async getAddressByTransactionHash(hash, index) {
    const url = `https://blockstream.info/${this[ctx].apiPrefix}/api/tx/${hash}/raw`;
    const response = await fetch(url, {method: 'GET'});
    if (response.status != 200) {
      let text = await response.text();
      throw `GET ${url} code: ${response.status} error: ${text}`;
    }
    const buffer = await response.buffer();
    const tx = Bitcoin.Transaction.fromBuffer(buffer);
    return this.getAddressFromScript(tx.outs[index].script);
  }

  /**
   * @param {number} index -- block index
   * @returns {[{block:.., from:.., to:.., time:.., value:.., bkhash:.., txhash:.., parentHash:..},..]} transactions with values in wei.  If block has only 0-valued
   *   transactions then only a single transaction is returned with `to` and `from` set to `null`, and `value` to `0`.
   */
  async getTransactionsForBlock(index) {
    this[checkInit]();
    try {
      const bkhash = await this.getHashOfBlock(index);
      const url = `https://blockstream.info/${this[ctx].apiPrefix}/api/block/${bkhash}/raw`;
      const response = await fetch(url, {method: 'GET'});
      if (response.status != 200) {
        let text = await response.text();
        throw `GET ${url} code: ${response.status} error: ${text}`;
      }
      const buffer = await response.buffer();
      const block = Bitcoin.Block.fromHex(buffer.toString('hex'));

      var transactions = block.transactions
      .map(t => {
        return {
          hash: t.getHash().reverse().toString('hex'),
          from: t.ins,
          to: t.outs.map(i => {
            return {address: this.getAddressFromScript(i.script), value: i.value}  
          })
        };
      });

      var relevantAddresses = [...new Set(transactions.flatMap(t => t.to.map(a => a.address)).filter(a => !!a))];
      relevantAddresses = await database.intersectTracked(relevantAddresses);

      transactions = transactions
        .filter(t => t.from && t.from.length === 1)
        .flatMap(t => {
          let res = t.to.map(m => relevantAddresses.some(r => r == m.address) ? [t.from, m.address, m.value] : [null, m.address, m.value]);
          return res.map(r => {return {...t, from: r[0], to: r[1], value: r[2]};});
        })
        .map(t => {
          if (!t.from) return t;
          return new Promise((resolve, reject) => {
            Promise.all(t.from.map(f => this.getAddressByTransactionHash(f.hash.reverse().toString('hex'), f.index)))
            .then((fromAddresses) => {
              resolve({
                ...t,
                from: fromAddresses[0]
              });
            })
          });
        });
      transactions = await Promise.all(transactions);

      const parentHash = block.prevHash.reverse().toString('hex');
      const time = new Date(block.timestamp * 1000);
      const filtered = (transactions || []).filter(t => t.value > 0);
      if (filtered.length == 0) {
        return [{
          block: index,
          from: null,
          to: null,
          time: time,
          value: 0,
          bkhash: bkhash,
          txhash: bkhash,
          parentHash: parentHash
        }];
      }
      return filtered
        .map(t => {
        return {
          block: index,
          from: t.from,
          to: t.to,
          time: time,
          value: t.value,
          bkhash: bkhash,
          txhash: t.hash,
          parentHash: parentHash
        }
      });  
    } catch (err) {
      this[metrics].errors++;
      throw err;
    }
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
        const url = `https://blockstream.info/${this[ctx].apiPrefix}/api/address/${address}/txs${beforeClause}`;
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
        const txsFromJson = await response.json();
        const theseTxs = txsFromJson
        .filter(t => t.vin.length === 1)
        .filter(t => !!t.status.block_height && !!t.status.block_hash)
        .filter(t => t.vout.length === 2)
        .flatMap(t => t.vout
          .map(o => {
            return {
              block: t.status.block_height,
              from: t.vin[0].prevout.scriptpubkey_address,
              to: o.scriptpubkey_address,
              value: parseInt(o.value),
              time: new Date(t.status.block_time * 1000),
              bkhash: t.status.block_hash,
              txhash: t.txid
            };
          }));
        txs = [...txs,...theseTxs];
        if (txsFromJson.length < 25) break;
        log(`more results from for ${address}, fetching more`);
        beforeClause = `/chain/${txsFromJson[txsFromJson.length - 1].txid}`;
      }
      
    } catch (err) {
      this[metrics].errors++;
      throw err;
    }

    if (!txs) throw new Error(`no result for ${address}`);
    this[metrics].txlistForAddressHits++;
    return txs;
  }

  /**
   * 
   * @param {string} address - of the public address corresponding to private key of signature
   * @param {string} signature - the signature
   * @param {string} message - that was signed (usually hash of payload)
   * @returns {boolean} if signature checks out
   */
  isSignatureValid(address, signature, message) {
    this[checkInit]();
    return (bitcoinMessage.verify(message, address, signature, null, true));
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

module.exports = (new BtcChain());