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
        const built = new blockBuilder();
        const tx1 = built.addTx("0001", "2021-03-30T01:00:00.000Z", null, null);
        tx1.addInput("sourceAddress1");
        tx1.addOutput(1000, "all_txs");
        tx1.addOutput(1000, "sourceAddress1");
        const tx2 = built.addTx("0002", "2021-03-30T02:00:00.000Z", "007", 700);
        tx2.addInput("sourceAddress1");
        tx2.addOutput(1250, "all_txs");
        tx2.addOutput(750, "sourceAddress1");
        const tx3 = built.addTx("0003", "2021-03-29T01:00:00.000Z", "004", 400);
        tx3.addInput("sourceAddress1");
        tx3.addOutput(250, "targetAddress2");
        tx3.addOutput(1000, "sourceAddress1");
        const tx4 = built.addTx("0004", "2021-03-29T01:00:00.000Z", "002", 200);
        tx4.addInput("sourceAddress1");
        tx4.addOutput(250, "all_txs");
        tx4.addOutput(1000, "sourceAddress1");
        const tx_too_many_inputs = built.addTx("0005", "2021-03-15T01:00:00.000Z", "0012", 102);
        tx_too_many_inputs.addInput("sourceAddress1");
        tx_too_many_inputs.addInput("sourceAddress2");
        tx_too_many_inputs.addOutput(1000, "all_txs");
        tx_too_many_inputs.addOutput(1000, "sourceAddress1");
        const tx_too_many_outputs = built.addTx("0007", "2021-03-15T01:00:00.000Z", "004", 104);
        tx_too_many_outputs.addInput("sourceAddress1");
        tx_too_many_outputs.addOutput(250, "targetAddress2");
        tx_too_many_outputs.addOutput(250, "targetAddress3");
        tx_too_many_outputs.addOutput(1000, "sourceAddress1");
        return built.result;
      }
    };
  }
  if (url.match(/twentyfive.*chain/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        return [];
      }
    };
  }
  if (url.match(/twentyfive/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        const built = new blockBuilder();
        for (let i = 0; i < 25; i++) {
          const tx = built.addTx(`00${i}`, `2021-03-29T01:00:00.0${i}Z`, "004", 400);
          tx.addInput(`sourceAddress${i}`);
          tx.addOutput(100, `twentyfive`);
          tx.addOutput(2000, `changeAddress${i}`);  
        }
        return built.result;
      }
    };
  }
  if (url.match(/thirty.*chain/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        const built = new blockBuilder();
        for (let i = 25; i < 30; i++) {
          const tx = built.addTx(`00${i}`, `2021-03-29T01:00:00.0${i}Z`, "004", 400);
          tx.addInput(`sourceAddress${i}`);
          tx.addOutput(100, `thirty`);
          tx.addOutput(2000, `changeAddress${i}`);  
        }
        return built.result;
      }
    };
  }
  if (url.match(/thirty/)) {
    return {
      status: 200,
      text: async () => 'OK',
      json: async () => {
        const built = new blockBuilder();
        for (let i = 0; i < 25; i++) {
          const tx = built.addTx(`00${i}`, `2021-03-29T01:00:00.0${i}Z`, "004", 400);
          tx.addInput(`sourceAddress${i}`);
          tx.addOutput(100, `thirty`);
          tx.addOutput(2000, `changeAddress${i}`);  
        }
        return built.result;
      }
    };
  }
});

require('../../main/js/lib/log.js').init({app_name:'test'});
const btcaddr = require('../../main/js/lib/btc-chain.js').init({btc_network:'fake'});

describe('getTransactionsForAddress tests', () => {

  /**************/
  /* The tests. */
  /**************/

  it('it should sum only valid values across all transactions', async () => {
    const result = await btcaddr.getTransactionsForAddress(`all_txs`);
    assert.isTrue(result.length === 6);
    assert.isTrue(result.filter(r => r.to == 'all_txs').length === 2);
    assert.isTrue(result.filter(r => r.to == 'all_txs').reduce((acc,next) => acc + next.value, 0) === 1500);
  });

  it('should sum only single request if 25 transactions signaled', async () => {
    const result = await btcaddr.getTransactionsForAddress(`twentyfive`);
    assert.isTrue(result.filter(r => r.to == 'twentyfive').length === 25);
    assert.isTrue(result.filter(r => r.to == 'twentyfive').reduce((acc,next) => acc + next.value, 0) === 2500);
  });

  it('should sum all transactions from all requests if 30 transactions signaled', async () => {
    const result = await btcaddr.getTransactionsForAddress(`thirty`);
    assert.isTrue(result.filter(r => r.to == 'thirty').length === 30);
    assert.isTrue(result.filter(r => r.to == 'thirty').reduce((acc,next) => acc + next.value, 0) === 3000);
  });
})

