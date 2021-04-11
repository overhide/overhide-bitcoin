const { expect } = require('chai');
const chai = require('chai');
const assert = chai.assert;
const mock = require('mock-require');
const blockBuilder = require('./block-response-builder.js');

mock('node-fetch', async (url) => {
  if (url.match(/all_txs/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        const built = new blockBuilder("sourceAddress1");
        const tx1 = built.addTx("2021-03-30T01:00:00.000Z", null, null);
        tx1.addInput(["sourceAddress1"]);
        tx1.addOutput(1000, ["all_txs"]);
        tx1.addOutput(1000, ["sourceAddress1"]);
        const tx2 = built.addTx("2021-03-30T02:00:00.000Z", "007", 700);
        tx2.addInput(["sourceAddress1"]);
        tx2.addOutput(1250, ["all_txs"]);
        tx2.addOutput(750, ["sourceAddress1"]);
        const tx3 = built.addTx("2021-03-29T01:00:00.000Z", "004", 400);
        tx3.addInput(["sourceAddress1"]);
        tx3.addOutput(250, ["targetAddress2"]);
        tx3.addOutput(1000, ["sourceAddress1"]);
        const tx4 = built.addTx("2021-03-29T01:00:00.000Z", "002", 200);
        tx4.addInput(["sourceAddress1"]);
        tx4.addOutput(250, ["all_txs"]);
        tx4.addOutput(1000, ["sourceAddress1"]);
        const tx_too_many_inputs = built.addTx("2021-03-15T01:00:00.000Z", "0012", 102);
        tx_too_many_inputs.addInput(["sourceAddress1"]);
        tx_too_many_inputs.addInput(["sourceAddress2"]);
        tx_too_many_inputs.addOutput(1000, ["all_txs"]);
        tx_too_many_inputs.addOutput(1000, ["sourceAddress1"]);
        const tx_too_many_adresses_in_input = built.addTx("2021-03-15T01:00:00.000Z", "0013", 103);
        tx_too_many_adresses_in_input.addInput(["sourceAddress1","sourceAddress2"]);
        tx_too_many_adresses_in_input.addOutput(1000, ["all_txs"]);
        tx_too_many_adresses_in_input.addOutput(1000, ["sourceAddress1"]);
        const tx_too_many_addresses_in_output = built.addTx("2021-03-15T01:00:00.000Z", "004", 104);
        tx_too_many_addresses_in_output.addInput(["sourceAddress1"]);
        tx_too_many_addresses_in_output.addOutput(250, ["targetAddress2","targetAddress3"]);
        tx_too_many_addresses_in_output.addOutput(1000, ["sourceAddress1"]);
        return built.result;
      }
    };
  }
  if (url.match(/newer_txs.*before=700/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        const built = new blockBuilder("sourceAddress1");
        const tx3 = built.addTx("2021-03-29T01:00:00.000Z", "004", 400);
        tx3.addInput(["sourceAddress1"]);
        tx3.addOutput(250, ["hasMore_txs"]);
        tx3.addOutput(1000, ["sourceAddress1"]);
        return built.result;
      }
    };
  }
  if (url.match(/newer_txs/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        const built = new blockBuilder("sourceAddress1");
        const tx2 = built.addTx("2021-03-30T02:00:00.000Z", "007", 700);
        tx2.addInput(["sourceAddress1"]);
        tx2.addOutput(1250, ["newer_txs"]);
        tx2.addOutput(750, ["sourceAddress1"]);
        return built.result;
      }
    };
  }
  if (url.match(/hasMore_txs.*before=700/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        const built = new blockBuilder("sourceAddress1");
        const tx3 = built.addTx("2021-03-29T01:00:00.000Z", "004", 400);
        tx3.addInput(["sourceAddress1"]);
        tx3.addOutput(250, ["hasMore_txs"]);
        tx3.addOutput(1000, ["sourceAddress1"]);
        return built.result;
      }
    };
  }
  if (url.match(/hasMore_txs/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        const built = new blockBuilder("sourceAddress1");
        built.setHasMore();
        const tx2 = built.addTx("2021-03-30T02:00:00.000Z", "007", 700);
        tx2.addInput(["sourceAddress1"]);
        tx2.addOutput(1250, ["hasMore_txs"]);
        tx2.addOutput(750, ["sourceAddress1"]);
        return built.result;
      }
    };
  }
});

require('../../main/js/lib/log.js').init({app_name:'test'});
const btcaddr = require('../../main/js/lib/btc-addrs-chain.js').init({btc_network:'fake'});

describe('getTransactionsForAddress tests', () => {

  /**************/
  /* The tests. */
  /**************/

  it('it should sum only valid values across all transactions', async () => {
    const result = await btcaddr.getTransactionsForAddress(`all_txs`);
    assert.isTrue(result.length === 2);
    assert.isTrue(result.reduce((acc,next) => acc + next.value, 0) === 1500);
  });

  it('should sum only newer transactions if no hasMore falgged', async () => {
    const result = await btcaddr.getTransactionsForAddress(`newer_txs`);
    assert.isTrue(result.length === 1);
    assert.isTrue(result.reduce((acc,next) => acc + next.value, 0) === 1250);
  });

  it('should sum all transactions from all requests if hasMore falgged', async () => {
    const result = await btcaddr.getTransactionsForAddress(`hasMore_txs`);
    assert.isTrue(result.length === 2);
    assert.isTrue(result.reduce((acc,next) => acc + next.value, 0) === 1500);
  });
})

