/**
 * Database evolution script for overhide-ledger.
 */

 const POSTGRES_HOST = process.env.POSTGRES_HOST || process.env.npm_config_POSTGRES_HOST || process.env.npm_package_config_POSTGRES_HOST || 'localhost'
 const POSTGRES_PORT = process.env.POSTGRES_PORT || process.env.npm_config_POSTGRES_PORT || process.env.npm_package_config_POSTGRES_PORT || 5432
 const POSTGRES_DB = process.env.POSTGRES_DB || process.env.npm_config_POSTGRES_DB || process.env.npm_package_config_POSTGRES_DB || 'oh-btc';
 const POSTGRES_USER = process.env.POSTGRES_USER || process.env.npm_config_POSTGRES_USER || process.env.npm_package_config_POSTGRES_USER || 'adam';
 const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || process.env.npm_config_POSTGRES_PASSWORD || process.env.npm_package_config_POSTGRES_PASSWORD || 'c0c0nut';
 const POSTGRES_SSL = process.env.POSTGRES_SSL || process.env.npm_config_POSTGRES_SSL || process.env.npm_package_config_POSTGRES_SSL;
 
 let conn_details = {
   host: POSTGRES_HOST,
   port: POSTGRES_PORT,
   database: POSTGRES_DB,
   user: POSTGRES_USER,
   password: POSTGRES_PASSWORD,
   ssl: POSTGRES_SSL
 };
 
 console.log(JSON.stringify(conn_details,null,2));
 
 const db = new (require('pg').Client)(conn_details);
 
 db.connect();
 
 (async () =>  {
   let result = null;
 
   result = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'btcstaging'`);
   if (result.rowCount == 0) {
     await db.query(`CREATE TABLE btcstaging (block integer NOT NULL,
                                              fromaddr text NULL,
                                              toaddr text NULL,
                                              blockts timestamptz NOT NULL,
                                              bkhash bytea NOT NULL,
                                              txhash bytea NOT NULL,
                                              value decimal NOT NULL)`);
     console.log(`created 'btcstaging' table.`);
   }
   await db.query('CREATE UNIQUE INDEX ON btcstaging (block, txhash, toaddr);');
   await db.query('CREATE INDEX ON btcstaging (block);');
   await db.query('CREATE INDEX ON btcstaging (fromaddr);');
   await db.query('CREATE INDEX ON btcstaging (toaddr);');
 
   result = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'btctransactions'`);
   if (result.rowCount == 0) {
     await db.query(`CREATE TABLE btctransactions (block integer NOT NULL,
                                                   fromaddr text NULL,
                                                   toaddr text NULL,
                                                   transactionts timestamptz NOT NULL,
                                                   txhash bytea NOT NULL,
                                                   value decimal NOT NULL)`);
     console.log(`created 'btctransactions' table.`);
   }
   await db.query('CREATE UNIQUE INDEX ON btctransactions (block, txhash, toaddr);');
   await db.query('CREATE INDEX ON btctransactions (fromaddr);');
   await db.query('CREATE INDEX ON btctransactions (toaddr);');
 
   result = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'btctrackedaddress'`);
   if (result.rowCount == 0) {
     await db.query(`CREATE TABLE btctrackedaddress (address text NULL,
                                                     checked timestamptz NOT NULL)`);
     console.log(`created 'btctrackedaddress' table.`);
   }
   await db.query('CREATE UNIQUE INDEX ON btctrackedaddress (address);');
 
   process.exit(0);
 
 })().catch((err) => {
   console.log(`ERROR: ${err}`);
   console.log(`ERROR: ${JSON.stringify(err,null,2)}`);
 });
 
 