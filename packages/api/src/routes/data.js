'use strict'
const { Router } = require('express')
const { getConnection } = require('../db')

const router = Router()

router.post('/query', async (req, res, next) => {
  const { sql } = req.body
  if (!sql) return res.status(400).json({ error: 'sql is required' })

  const conn = await getConnection()
  try {
    const result = await conn.execute(sql)
    res.json({
      columns: result.metaData.map(m => m.name),
      rows: result.rows,
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  } finally {
    await conn.close()
  }
})

module.exports = router
