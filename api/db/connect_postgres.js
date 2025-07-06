const { Pool } = require('pg');
require('dotenv').config();

const POSTGRES_CONN_STRING = process.env.POSTGRES_CONN_STRING;
const pool = new Pool({ connectionString: POSTGRES_CONN_STRING, ssl: { rejectUnauthorized: false } });

module.exports = pool;