"use strict";

class Output {
  result = {};

  constructor(value, address) {
    if (!!address) this.result['scriptpubkey_address'] = address;
    if (!!value) this.result['value'] = value;
  }
}

class Input {
  result = {};

  constructor(address) {
    if (!!address) this.result['prevout'] = {scriptpubkey_address: address};
  }
}

class Tx {
  result = {status: {}};

  constructor(id, timestamp, block_hash, block_height) {
    if (!!id) this.result['txid'] = id;
    if (!!timestamp) this.result.status['block_time'] = Date.parse(timestamp) / 1000;
    if (!!block_hash) this.result.status['block_hash'] = block_hash;
    if (!!block_height) this.result.status['block_height'] = block_height;
  }

  addInput(address) {
    if (!('vin' in this.result)) this.result['vin'] = [];
    const newInput = new Input(address);
    this.result['vin'].push(newInput.result);
    return newInput;
  }

  addOutput(value, addresses) {
    if (!('vout' in this.result)) this.result['vout'] = [];
    const newOutput = new Output(value, addresses);
    this.result['vout'].push(newOutput.result);
    return newOutput;
  }
}

module.exports = class Builder {
  result = [];

  constructor() {
  }

  addTx(id, timestamp, block_hash, block_height) {
    const newTx = new Tx(id, timestamp, block_hash, block_height);
    this.result.push(newTx.result);
    return newTx;
  }
}

