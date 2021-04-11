"use strict";

class Output {
  result = {};

  constructor(value, addresses) {
    if (!!addresses) this.result['addresses'] = addresses;
    if (!!value) this.result['value'] = value;
  }
}

class Input {
  result = {};

  constructor(addresses) {
    if (!!addresses) this.result['addresses'] = addresses;
  }
}

class Tx {
  result = {};

  constructor(received, block_hash, block_height) {
    if (!!received) this.result['received'] = received;
    if (!!block_hash) this.result['block_hash'] = block_hash;
    if (!!block_height) this.result['block_height'] = block_height;
  }

  addInput(addresses) {
    if (!('inputs' in this.result)) this.result['inputs'] = [];
    const newInput = new Input(addresses);
    this.result['inputs'].push(newInput.result);
    return newInput;
  }

  addOutput(value, addresses) {
    if (!('outputs' in this.result)) this.result['outputs'] = [];
    const newOutput = new Output(value, addresses);
    this.result['outputs'].push(newOutput.result);
    return newOutput;
  }
}

module.exports = class Builder {
  result = {};

  /**
   * @param {string} address -- from address for response
   */
  constructor(address) {
    if (!!address) this.result['address'] = address;
  }

  setHasMore() {
    this.result['hasMore'] = true;
    return this;
  }

  addTx(received, block_hash, block_height) {
    if (!('txs' in this.result)) this.result['txs'] = [];
    const newTx = new Tx(received, block_hash, block_height);
    this.result['txs'].push(newTx.result);
    return newTx;
  }
}

