'use strict'
const oracledb = require('oracledb')

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

let pool

async function initPool() {
  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: Number(process.env.ORACLE_POOL_MIN) || 2,
    poolMax: Number(process.env.ORACLE_POOL_MAX) || 10,
    poolIncrement: 1,
  })
}

async function getConnection() {
  if (!pool) throw new Error('DB pool not initialized. Call initPool() first.')
  return pool.getConnection()
}

async function closePool() {
  if (pool) await pool.close(0)
}

module.exports = { initPool, getConnection, closePool }
