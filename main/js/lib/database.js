"use strict";

const Pool = require('pg').Pool;
const log = require('./log.js').fn("database");
const event = require('./log.js').fn("database-event");
const debug = require('./log.js').debug_fn("database");

// private attribtues
const ctx = Symbol('context');

// private functions
const checkInit = Symbol('checkInit');
const logEvent = Symbol('logEvent');

/**
 * Wires up functionality we use throughout.
 * 
 * Module returns this class as object all wired-up.  Before you can use the mbtcods you must "init" the object 
 * somewhere at process start.
 * 
 * Leverages node's module system for a sort of context & dependency injection, so order of requiring and initializing
 * these sorts of libraries matters.
 */
class Database {
  constructor() {
    this[ctx] = null;
  }

  // ensure this is initialized
  [checkInit]() {
    if (! this[ctx]) throw new Error('library not initialized, call "init" when wiring up app first');
  }

  // use logging as DB event log (backup of sorts)
  //
  // @param {String} query -- to log
  // @param {*} params -- to log
  [logEvent](query, params = []) {   
    for (var i = 0; i < params.length; i++) {
      var param = params[i];
      query = query.replace(`$${i+1}`,`'${param}'`);
    }
    event(query);
  }

  /**
   * Initialize this library: this must be the first mbtcod called somewhere from where you're doing context & dependency
   * injection.
   * 
   * @param {string} pghost
   * @param {number} phport
   * @param {string} pgdatabase
   * @param {string} pguse
   * @param {string} pgpassword
   * @param {string} pgssl - true or false
   * @param {number} confirmations - number of confirmations required to approve of tx
   * @returns {Database} this
   */
  init({pghost,pgport,pgdatabase,pguser,pgpassword, pgssl, confirmations} = {}) {
    if (pghost == null) throw new Error("POSTGRES_HOST must be specified.");
    if (pgport == null) throw new Error("POSTGRES_PORT must be specified.");
    if (pgdatabase == null) throw new Error("POSTGRES_DB must be specified.");
    if (pguser == null) throw new Error("POSTGRES_USER must be specified.");
    if (pgpassword == null) throw new Error("POSTGRES_PASSWORD must be specified.");
    if (confirmations == null) throw new Error("EXPECTED_CONFIRMATIONS must be specified.");

    const db = new Pool({
      host: pghost,
      port: pgport,
      database: pgdatabase,
      user: pguser,
      password: pgpassword,
      ssl: pgssl
    });

    this[ctx] = {
      db: db,
      confirmations: confirmations
    };
    
    return this;
  }

  /**
   * Add new transactions -- with chain continuity check: only next new block is allowed to be added.
   * 
   * @param {[{block: number, from: string, to: string, time: Date, value: string, hash:.., parentHash:..},..]} transactions -- list of transactions to add; `from` and `to` are "0x" prefixed addresses.  All transactions must be for the same block.
   */
  async addBlockTransactions(transactions) {
    this[checkInit]();
    try {
      if (!transactions || transactions.length == 0) {
        throw "no transactions";
      }
      if ((new Set(transactions.map(t => t.block))).length > 1) throw "mutliple blocks in transactions list, not allowed";
      
      const block = transactions[0].block;
      const time = transactions[0].time.toISOString();
      const hash = transactions[0].hash.slice(2);
      const parentHash = transactions[0].parentHash.slice(2);

      var stageValues = transactions.map(t => `(
          (SELECT _block_ + 1 FROM CTE),
          ${t.from ? "decode('" + t.from.slice(2) + "','hex')" : null}, 
          ${t.to ? "decode('" + t.to.slice(2) + "','hex')" : null}, 
          '${time}', 
          decode('${hash}', 'hex'),
          '${t.value}'
        )`);
      stageValues = stageValues.join(',');

      // The insertion into btcstaging below is conditional on the table having the previous block as the last block.
      // If previous block is not present or doesn't match parentHash, do not insert -- it's possible it was deleted because of chain hash mismatch.
      // If that happens, we cause a null constraint violation (insertion from CTE below) and abort.
      var query = 
        `
          BEGIN;

            WITH CTE AS (SELECT MAX(block) AS _block_ FROM btcstaging WHERE 
              block=${block - 1} 
              AND block=(SELECT MAX(block) FROM btcstaging)
              AND hash=decode('${parentHash}', 'hex'))
            INSERT INTO btcstaging (block, fromaddr, toaddr, blockts, hash, value) 
              VALUES ${stageValues} 
              ON CONFLICT (block, fromaddr, toaddr, value) DO NOTHING;

            INSERT INTO btctransactions (block, fromaddr, toaddr, transactionts, value)
              (
                SELECT block, fromaddr, toaddr, blockts, value FROM btcstaging S
                  JOIN btctrackedaddress A ON S.fromaddr = A.address OR S.toaddr = A.address
              )
              ON CONFLICT (block, fromaddr, toaddr, value) DO NOTHING;

            DELETE FROM btcstaging WHERE block < ${block} - 100;

          COMMIT;
        `;
      await this[ctx].db.query(query);
    } catch (err) {
      throw `addBlockTransactions error :: ${String(err)} :: ${query}`;
    }
  }

  /**
   * Add transactions -- no chain continuity check -- assumption is these are valid.  Use this to seed when there are no previous transactions to check against
   * 
   * @param {[{block: number, from: string, to: string, time: Date, value: string, hash:.., parentHash:..},..]} transactions -- list of transactions to add; `from` and `to` are "0x" prefixed addresses.  All transactions must be for the same block.
   */
   async addBlockTransactionsNoCheck(transactions) {
    this[checkInit]();
    try {
      if (!transactions || transactions.length == 0) {
        throw "no transactions";
      }
      if ((new Set(transactions.map(t => t.block))).length > 1) throw "mutliple blocks in transactions list, not allowed";
      
      const block = transactions[0].block;
      const time = transactions[0].time.toISOString();
      const hash = transactions[0].hash.slice(2);

      var stageValues = transactions.map(t => `(
          ${t.block}, 
          ${t.from ? "decode('" + t.from.slice(2) + "','hex')" : null}, 
          ${t.to ? "decode('" + t.to.slice(2) + "','hex')" : null}, 
          '${time}', 
          decode('${hash}', 'hex'),
          '${t.value}'
        )`);
      stageValues = stageValues.join(',');

      var query = 
        `
          BEGIN;

            INSERT INTO btcstaging (block, fromaddr, toaddr, blockts, hash, value) 
              VALUES ${stageValues} 
              ON CONFLICT (block, fromaddr, toaddr, value) DO NOTHING;
          
            INSERT INTO btctransactions (block, fromaddr, toaddr, transactionts, value)
              (
                SELECT block, fromaddr, toaddr, blockts, value FROM btcstaging S
                  JOIN btctrackedaddress A ON S.fromaddr = A.address OR S.toaddr = A.address
              )
              ON CONFLICT (block, fromaddr, toaddr, value) DO NOTHING;
              
          COMMIT;
        `;
      await this[ctx].db.query(query);
    } catch (err) {
      throw `addBlockTransactionsNoCheck error :: ${String(err)} :: ${query}`;
    }
  }

  /**
   * Delete block from database.
   * 
   * @param {number} block -- index to delete
   * check against
   */
   async deleteBlock(block) {
    this[checkInit]();
    try {
      var query = `SELECT DISTINCT block, blockts, hash, fromaddr, toaddr FROM btcstaging WHERE block >= ${block};`;
      let result = await this[ctx].db.query(query);
      log('deleting blocks from staging => %o', [...new Set(result.rows.map(row => row.block))]);

      var addresses = new Set([...result.rows.map(r => r.fromaddr.toString('hex')) ,...result.rows.map(r => r.toaddr.toString('hex'))]);
      addresses = [...addresses].map(a => `decode('${a}','hex')`);
      addresses = addresses.join(',');

      var query = `
          BEGIN;
            DELETE FROM btcstaging WHERE block >= ${block};
            DELETE FROM btctransactions WHERE fromaddr in (${addresses});
            DELETE FROM btctransactions WHERE toaddr in (${addresses});
            DELETE FROM btctrackedaddress WHERE address in (${addresses});
          COMMIT;
        `;
      await this[ctx].db.query(query);
    } catch (err) {
      throw `deleteBlock error :: ${String(err)} :: ${query}`;
    }
  }

  /**
   * Add transactions for a new address we will be tracking.
   * 
   * REMARK:  this method respects the EXPECTED_CONFIRMATIONS config point -- checks max block and does not add transactions higher than that.
   * 
   * @param {[{block: number, from: string, to: string, time: Date, value: string, hash:.., parentHash:..},..]} transactions -- list of transactions
   *   to add; `from` and `to` are "0x" prefixed addresses.
   * @param {string} address -- '0x' prefixed hex address.
   */
   async addTransactionsForNewAddress(transactions, address) {
    this[checkInit]();
    try {
      const maxBlock = (await this.getMaxBlock()) - this[ctx].confirmations;

      transactions = transactions.filter(t => t.block <= maxBlock);    

      if (!transactions || transactions.length == 0) {
        throw "no transactions";
      }
      
      var txs = transactions.map(t => `(
          ${t.block},
          ${t.from ? "decode('" + t.from.slice(2) + "','hex')" : null}, 
          ${t.to ? "decode('" + t.to.slice(2) + "','hex')" : null}, 
          '${t.time.toISOString()}', 
          '${t.value}'
        )`);
      txs = txs.join(',');

      address = `decode('${address.slice(2)}','hex')`;

      var query = 
        `
          BEGIN;

            INSERT INTO btctransactions (block, fromaddr, toaddr, transactionts, value) VALUES ${txs} 
              ON CONFLICT (block, fromaddr, toaddr, value) DO NOTHING;

            INSERT INTO btctransactions (block, fromaddr, toaddr, transactionts, value) 
             (
                SELECT block, fromaddr, toaddr, blockts, value FROM btcstaging S
                  WHERE S.fromaddr = ${address} OR S.toaddr = ${address}
             )
             ON CONFLICT (block, fromaddr, toaddr, value) DO NOTHING;
          
            INSERT INTO btctrackedaddress (address, checked) VALUES (${address}, NOW())
              ON CONFLICT (address) DO NOTHING;

          COMMIT;
        `;
      await this[ctx].db.query(query);
    } catch (err) {
      throw `addTransactionsForNewAddress error :: ${String(err)} :: ${query}`;
    }
  }

  /**
   * Check if address is being tracked.
   * 
   * @param {string} address -- '0x' prefixed hex address.
   * @returns {bool} whbtcer address is tracked in database or not
   */
  async checkAddressIsTracked(address) {
    this[checkInit]();
    try {
      address = `decode('${address.slice(2)}','hex')`;
      const query = `UPDATE btctrackedaddress SET checked = NOW() WHERE address = ${address};`;
      let result = await this[ctx].db.query(query);
      return result.rowCount > 0;
    } catch (err) {
      throw `checkAddressIsTracked error :: ${String(err)}`;
    }
  }

  /**
   * Get transactions for address
   * 
   * @param {string} fromAddress -- '0x' prefixed address to get transactions for.
   * @param {string} toAddress -- '0x' prefixed recepient address to get transactions for.
   * @returns {[{block: number, from: string, to: string, time: Date, value: string},..]} transactions
   */
  async getTransactionsFromTo(fromAddress, toAddress) {
    this[checkInit]();
    try {
      const query = `
        SELECT block, fromaddr, toaddr, value, transactionts 
          FROM btctransactions 
          WHERE fromaddr = decode($1,'hex') AND toaddr = decode($2,'hex')
          ORDER BY transactionts DESC
      `;
      const params = [fromAddress.slice(2), toAddress.slice(2)];
      debug('%s <= %o', query, params);
      let result = await this[ctx].db.query(query, params);
      if (result.rowCount == 0) {
        return [];
      }
      result = result.rows.map(row => {
        return {
          block: row.block,
          from: row.fromaddr ? `0x${row.fromaddr.toString('hex')}` : null,
          to: row.toaddr ? `0x${row.toaddr.toString('hex')}` : null,
          time: row.transactionts,
          value: row.value
        };     
      });
      return result;
    } catch (err) {
      throw `getTransactionsFromTo error :: ${String(err)}`;
    }
  }

  /**
   * Get largest block number
   * 
   * @returns {number} largest (most recent) known block number, or -1 if no blocks.
   */
  async getMaxBlock() {
    this[checkInit]();
    try {
      const query = `SELECT max(block) FROM btcstaging`;
      let result = await this[ctx].db.query(query);
      if (!result || result.rowCount == 0 || !result.rows[0].max) {
        return -1;
      }
      return result.rows[0].max;
    } catch (err) {
      throw `getMaxBlock error :: ${String(err)}`;
    }
  }

  /**
   * Get min block number
   * 
   * @returns {number} smallest (oldest) known block number.
   */
   async getMinBlock() {
    this[checkInit]();
    try {
      const query = `SELECT min(block) FROM btcstaging`;
      let result = await this[ctx].db.query(query);
      if (result.rowCount == 0) {
        return [];
      }
      return result.rows[0].min;
    } catch (err) {
      throw `getMinBlock error :: ${String(err)}`;
    }
  }  

  /**
   * Call when process is exiting.
   */
  async terminate() {
    this[checkInit]();
    debug(`terminating`);
    await this[ctx].db.end();
  }

  /**
   * @returns {string} null if no error else error string if problem using DB from connection pool.
   */
  async getError() {
    this[checkInit]();
    try {
      var client = await this[ctx].db.connect();
      const res = await client.query('SELECT NOW()');
      return null;
    } catch (err) {
      log(`not healthy: ${String(err)}`);
      return String(err);
    } finally {
      if (client) client.release()
    }    
  }
}

module.exports = (new Database());