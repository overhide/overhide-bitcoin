"use strict";

const database = require('../lib/database.js');
const btc = require('../lib/btc-chain.js');

const log = require('../lib/log.js').fn("is-signature-valid");
const debug = require('../lib/log.js').debug_fn("is-signature-valid");

async function is_signature_valid({signature, message, address, skipLedger}) {
  if (typeof signature !== 'string' || typeof message !== 'string' || typeof address !== 'string') throw new Error('signature, message, address must be strings');

  if (!skipLedger && !await database.checkAddressIsTracked(address)) {
    const txs = await btc.getTransactionsForAddress(address);
    if (!txs || txs.length == 0) {
      throw `no transactions for address ${address} on chain.`;
    }
    await database.addTransactionsForNewAddress(txs, address);    
  }

  // check signature valid
  var msg = Buffer.from(message,"base64").toString("ascii");
  var sig = Buffer.from(signature,"base64").toString("ascii");
  if (!btc.isSignatureValid(address,sig,msg)) throw new Error("invalid signature");
  return null;
}

module.exports = is_signature_valid;