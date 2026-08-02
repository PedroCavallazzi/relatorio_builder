'use strict'
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { initPool, getConnection, closePool } = require('./db')

async function migrate() {
  await initPool()
  const conn = await getConnection()
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/001_create_tables.sql'),
      'utf8'
    )
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
    for (const stmt of statements) {
      try {
        await conn.execute(stmt)
        console.log('OK:', stmt.slice(0, 60))
      } catch (err) {
        if (err.errorNum === 955) {
          console.log('Already exists, skipping.')
        } else {
          throw err
        }
      }
    }
    await conn.commit()
  } finally {
    await conn.close()
    await closePool()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
