const btc_acct1 = 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau'; 

const btc_acct2 = 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80z';

const POINT_0_1_BTC_IN_SATOSHIS = 1000000;

const HOST = process.env.HOST || process.env.npm_config_HOST || process.env.npm_package_config_HOST || 'localhost';
const PORT = process.env.PORT || process.env.npm_config_PORT || process.env.npm_package_config_PORT || 8080;
const TOKEN_URL = `https://token.overhide.io/token`;
const API_KEY = '0x___API_KEY_ONLY_FOR_DEMOS_AND_TESTS___';
const ISPROD = process.env.ISPROD || process.env.npm_config_ISPROD || process.env.npm_package_config_ISPROD || false;
const POSTGRES_HOST = process.env.POSTGRES_HOST || process.env.npm_config_POSTGRES_HOST || process.env.npm_package_config_POSTGRES_HOST || 'postgres'
const POSTGRES_PORT = process.env.POSTGRES_PORT || process.env.npm_config_POSTGRES_PORT || process.env.npm_package_config_POSTGRES_PORT || 5432
const POSTGRES_DB = process.env.POSTGRES_DB || process.env.npm_config_POSTGRES_DB || process.env.npm_package_config_POSTGRES_DB || 'oh-btc';
const POSTGRES_USER = process.env.POSTGRES_USER || process.env.npm_config_POSTGRES_USER || process.env.npm_package_config_POSTGRES_USER || 'adam';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || process.env.npm_config_POSTGRES_PASSWORD || process.env.npm_package_config_POSTGRES_PASSWORD || 'c0c0nut';
const POSTGRES_SSL = process.env.POSTGRES_SSL || process.env.npm_config_POSTGRES_SSL || process.env.npm_package_config_POSTGRES_SSL;
const EXPECTED_CONFIRMATIONS = process.env.EXPECTED_CONFIRMATIONS || process.env.npm_config_EXPECTED_CONFIRMATIONS || process.env.npm_package_config_EXPECTED_CONFIRMATIONS || 2;


const chai = require('chai');
const chaiHttp = require('chai-http');
const { stringify } = require('querystring');
require('../../main/js/lib/log.js').init({app_name:'smoke'});
const crypto = require('../../main/js/lib/crypto.js').init();
const btc = require('../../main/js/lib/btc-chain.js').init({isProd: ISPROD});
const database = require('../../main/js/lib/database.js').init({
  pghost: POSTGRES_HOST,
  pgport: POSTGRES_PORT,
  pgdatabase: POSTGRES_DB,
  pguser: POSTGRES_USER,
  pgpassword: POSTGRES_PASSWORD,
  pgssl: POSTGRES_SSL,
  confirmations: EXPECTED_CONFIRMATIONS
});
const uuid = require('uuid');
const assert = chai.assert;

var TOKEN;

chai.use(chaiHttp);

async function instrumentDb() {
  console.log(`instrumenting DB`);
  await database.addBlockTransactionsNoCheck([{block: 403, from: '00', to: '00', value: '1000000', time: new Date('2020-05-07T14:57:36Z'), bkhash:'00', txhash: '10', parentHash:'00'}]);
  await database.addBlockTransactionsNoCheck([{block: 402, from: '00', to: '00', value: '1000000', time: new Date('2020-05-07T14:47:36Z'), bkhash:'00', txhash: '10', parentHash:'00'}]);
  await database.addBlockTransactionsNoCheck([{block: 401, from: '00', to: '00', value: '1000000', time: new Date('2020-05-07T14:37:36Z'), bkhash:'00', txhash: '10', parentHash:'00'}]);
  await database.addBlockTransactionsNoCheck([{block: 400, from: '00', to: '00', value: '1000000', time: new Date('2020-05-07T14:27:36Z'), bkhash:'00', txhash: '10', parentHash:'00'}]);
  await database.addTransactionsForNewAddress([
    {block: 200, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80z', value: '1000000', time: new Date('2019-05-07T14:27:36Z'), bkhash:'00', txhash: '01'},
    {block: 200, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthkau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80z', value: '1000000', time: new Date('2019-05-07T14:27:36Z'), bkhash:'00', txhash: '02'},
    {block: 200, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80y', value: '1000000', time: new Date('2019-05-07T14:27:36Z'), bkhash:'00', txhash: '03'},
    {block: 200, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthkau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80y', value: '1000000', time: new Date('2019-05-07T14:27:36Z'), bkhash:'00', txhash: '04'},
  ], 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau');
  await database.addTransactionsForNewAddress([
    {block: 190, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80z', value: '1000000', time: new Date('2019-05-07T14:19:06Z'), bkhash:'00', txhash: '05'},
    {block: 190, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthkau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80z', value: '1000000', time: new Date('2019-05-07T14:19:06Z'), bkhash:'00', txhash: '06'},
    {block: 190, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80y', value: '1000000', time: new Date('2019-05-07T14:19:06Z'), bkhash:'00', txhash: '07'},
    {block: 190, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthkau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80y', value: '1000000', time: new Date('2019-05-07T14:19:06Z'), bkhash:'00', txhash: '08'},
    {block: 180, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80z', value: '1000000', time: new Date('2019-05-07T14:14:06Z'), bkhash:'00', txhash: '09'},
    {block: 180, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthkau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80z', value: '1000000', time: new Date('2019-05-07T14:14:06Z'), bkhash:'00', txhash: '0A'},
    {block: 180, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80y', value: '1000000', time: new Date('2019-05-07T14:14:06Z'), bkhash:'00', txhash: '0B'},
    {block: 180, from: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthkau', to: 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80y', value: '1000000', time: new Date('2019-05-07T14:14:06Z'), bkhash:'00', txhash: '0C'}
  ], 'tb1qr9d7z0es86sps5f2kefx5grpj4a5yvp4evj80z');
  console.log(`instrumented DB`);
}



// @return promise
function getToken() {
  return new Promise((resolve,reject) => {
    var endpoint = `${TOKEN_URL}?apikey=${API_KEY}`;
    console.log("getToken :: hitting endpoint " + endpoint);
    try {
      require("https").get(endpoint, (res) => {
        const { statusCode } = res;
        if (statusCode != 200) {          
          reject();
        } else {
          res.on('data', (data) => {
            TOKEN = data;
            console.log("getToken :: OK: " + TOKEN);
            resolve();
          })  
        }
      }).on('error', err => reject(err));
    } catch (err) {
      console.log("getToken :: error: " + err);
      reject(err);
    }
  });  
}

describe('smoke tests', () => {

  // initialization hook for every test
  before((done) => { 
    console.log("Settings: \n");
    HOST && console.log('HOST:'+HOST);
    PORT && console.log('PORT:'+PORT);
    TOKEN_URL && console.log('TOKEN_URL:'+TOKEN_URL);
    API_KEY && console.log('API_KEY:'+API_KEY);
    console.log("\n");

    (async () => {
      await getToken();
      await instrumentDb();
      done();
    })();
  });

  /**************/
  /* The tests. */
  /**************/

  it('validates a total of .03 btc was transferred from btc_acct1 to btc_acct2', (done) => {
    chai.request('http://' + HOST + ':' + PORT)
      .get('/get-transactions/'+btc_acct1+'/'+btc_acct2)
      .set({ "Authorization": `Bearer ${TOKEN}` })
      .then(function(res) {
        var reso = JSON.parse(res.text);
        console.log(res.text);
        assert.isTrue(reso.tally == (3 * POINT_0_1_BTC_IN_SATOSHIS));
        assert.isTrue(Array.isArray(reso.transactions));
        assert.isTrue(reso.transactions.length == 3);
        for (var tx of reso.transactions) {
          assert.isTrue(parseInt(tx["transaction-value"]) == POINT_0_1_BTC_IN_SATOSHIS);
          assert.isTrue((new Date(tx["transaction-date"])).getUTCFullYear() == '2019');
        }
        done();
      })
      .catch(function(err) {
        throw err;
      });
  });

  it('validates .02 btc was transferred from btc_acct1 to btc_acct2 in the last 2 transactions', (done) => {
    chai.request('http://' + HOST + ':' + PORT)
      .get('/get-transactions/'+btc_acct1+'/'+btc_acct2+'?max-most-recent=2')
      .set({ "Authorization": `Bearer ${TOKEN}` })
      .then(function(res) {
        var reso = JSON.parse(res.text);
        assert.isTrue(reso.tally == (2 * POINT_0_1_BTC_IN_SATOSHIS));
        assert.isTrue(Array.isArray(reso.transactions));
        assert.isTrue(reso.transactions.length == 2);
        const txsShouldBeOlderThan = new Date('2018-11-25T00:00:00Z').getTime();
        for (var tx of reso.transactions) {
          assert.isTrue(parseInt(tx["transaction-value"]) == POINT_0_1_BTC_IN_SATOSHIS);
          assert.isTrue((new Date(tx["transaction-date"])).getTime() > txsShouldBeOlderThan);
        }
        done();
      })
      .catch(function(err) {
        throw err;
      });
  });

  it('validates .02 btc was transferred in 2 transactions from btc_acct1 to btc_acct2 since 2019-05-07T14:18:00Z', (done) => {
    const sinceStr = '2019-05-07T14:18:00Z';
    chai.request('http://' + HOST + ':' + PORT)
      .get('/get-transactions/'+btc_acct1+'/'+btc_acct2+'?since='+sinceStr)
      .set({ "Authorization": `Bearer ${TOKEN}` })
      .then(function(res) {
        var reso = JSON.parse(res.text);
        assert.isTrue(reso.tally == (2 * POINT_0_1_BTC_IN_SATOSHIS));
        assert.isTrue(Array.isArray(reso.transactions));
        assert.isTrue(reso.transactions.length == 2);
        const txsShouldBeOlderThan = new Date(sinceStr).getTime();
        for (var tx of reso.transactions) {
          assert.isTrue(parseInt(tx["transaction-value"]) == POINT_0_1_BTC_IN_SATOSHIS);
          assert.isTrue((new Date(tx["transaction-date"])).getTime() > txsShouldBeOlderThan);
        }
        done();
      })
      .catch(function(err) {
        throw err;
      });
  });

  it('validates .02 btc was transferred from btc_acct1 to btc_acct2 since 2019-05-07T14:18:00Z as tally only', (done) => {
    const sinceStr = '2019-05-07T14:18:00Z';
    chai.request('http://' + HOST + ':' + PORT)
      .get('/get-transactions/'+btc_acct1+'/'+btc_acct2+'?since='+sinceStr+'&tally-only=true')
      .set({ "Authorization": `Bearer ${TOKEN}` })
      .then(function(res) {
        var reso = JSON.parse(res.text);
        assert.isTrue(reso.tally == (2 * POINT_0_1_BTC_IN_SATOSHIS));
        assert.notExists(reso.transactions);
        done();
      })
      .catch(function(err) {
        throw err;
      });
  });


  it('validates lowercase and uppercase addresses work', (done) => {
    chai.request('http://' + HOST + ':' + PORT)
      .get('/get-transactions/'+btc_acct1.toUpperCase()+'/'+btc_acct2.toLowerCase())
      .set({ "Authorization": `Bearer ${TOKEN}` })
      .then(function(res) {
        assert.isTrue(res.statusCode == 200);
        done();
      })
      .catch(function(err) {
        throw err;
      });
  });

  it('validates checking signature', (done) => {   
    /* 
      sending payload:
      
      {
        "signature": "SDBZWTdEaUEyOVlvU1IzTDBEaGQybThnRGw5UFYvdjdyUlg3UVNob1FLMkFOcHBGVHRPYmx3azExMkVDOElSNlBpaWFyUHBKMlgvVUxjQk9KSXNKd3lrPQ==",
        "message": "Zm9v",
        "address": "tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau"
      }    
    */
    chai.request('http://' + HOST + ':' + PORT)
      .post('/is-signature-valid')
      .set({ "Authorization": `Bearer ${TOKEN}` })
      .send({
        signature: 'SDBZWTdEaUEyOVlvU1IzTDBEaGQybThnRGw5UFYvdjdyUlg3UVNob1FLMkFOcHBGVHRPYmx3azExMkVDOElSNlBpaWFyUHBKMlgvVUxjQk9KSXNKd3lrPQ==',
        message: 'Zm9v',
        address: 'tb1q2ye03p4jdcja4vn9ap4tfq0qcc6esw3zwthcau'
      })
      .then(function(res) {
        assert.isTrue(res.statusCode == 200);
        done();
      })
      .catch(function(err) {
        throw err;
      });
  });

  it('valid signature but address unused on blockchain returns 400', (done) => {
    chai.request('http://' + HOST + ':' + PORT)
      .post('/is-signature-valid')
      .set({ "Authorization": `Bearer ${TOKEN}` })
      .send({
        signature: 'SDM3Z2x0QTlQOS9oU0NmUm5tVjhNTC9abjdRUjFsZHZnN3RrWXdBWUYzb3hHcksvYzJGdEZMN3YzODBkY3dSamNuVUxMcVBWbUJ5L1diWmF6YWFGYklFPQ==',
        message: 'dGVzdA==',
        address: 'tb1qxcyyncgtajjdxul8pxws526hw8kcu7ypc00je3'
      })
      .then(function(res) {
        assert.isTrue(res.statusCode == 400);
        done();
      })
      .catch(function(err) {
        throw err;
      });
  });
})

