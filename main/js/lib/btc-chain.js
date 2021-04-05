"use strict";

const crypto = require('crypto')
const fetch = require('node-fetch');
const log = require('./log.js').fn("btc-chain");
const bitcoinMessage = require('bitcoinjs-message')

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
   * @param {string} btc_network - which network are we using
   * @return {BtcChain} this
   */
  init({btc_network} = {}) {
    if (btc_network == null) throw new Error("NETWORK_TYPE must be specified.");

    this[ctx] = {
      btc_network: btc_network
    };
    this[metrics] = {
      errors: 0,
      errorsLastCheck: 0,
      errorsDelta: 0
    };

    return this;
  }

  /**
   * @param {number} index -- block index
   * @returns {number} latest block number.
   */
  async getLatestBlock() {
    this[checkInit]();
    try {
      const url = `https://api.blockcypher.com/v1/btc/${this[ctx].btc_network}`;
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
      return response.height;  
    } catch (err) {
      this[metrics].errors++;
      throw err;
    }
  }

  /**
   * @param {number} index -- block index
   * @returns {[{block:.., from:.., to:.., time:.., value:.., hash:.., parentHash:..},..]} transactions with values in wei.  If block has only 0-valued
   *   transactions then only a single transaction is returned with `to` and `from` set to `null`, and `value` to `0`.
   */
  async getTransactionsForBlock(index) {
    this[checkInit]();
    try {
      const url = `https://api.blockcypher.com/v1/btc/${this[ctx].btc_network}/blocks/671142?txstart=1&limit=1`;
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
      const block = result.number;
      const hash = result.hash;
      const parentHash = result.parentHash;
      const time = new Date(result.timestamp * 1000);
      const filtered = (result.transactions || []).filter(t => t.value > 0);
      if (filtered.length == 0) {
        return [{
          block: block,
          from: null,
          to: null,
          time: time,
          value: 0,
          hash: hash,
          parentHash: parentHash
        }];
      }
      return filtered
        .map(t => {
        return {
          block: block,
          from: t.from,
          to: t.to,
          time: time,
          value: t.value,
          hash: hash,
          parentHash: parentHash
        }
      });  
    } catch (err) {
      throw err;
    }
  }

  /**
   * 
   * @param {string} address - of the public address corresponding to private key of signature
   * @param {string} signature - the signature ('0x..')
   * @param {string} message - that was signed (usually hash of payload)
   * @returns {boolean} if signature checks out
   */
  isSignatureValid(address, signature, message) {
    this[checkInit]();
    return (bitcoinMessage.verify(message, address, signature));
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