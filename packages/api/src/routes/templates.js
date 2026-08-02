'use strict'
const { Router } = require('express')
const { getConnection } = require('../db')

const router = Router()

router.get('/', async (req, res, next) => {
  const conn = await getConnection()
  try {
    const result = await conn.execute(
      `SELECT id, name, description, updated_at FROM report_templates ORDER BY updated_at DESC`
    )
    res.json(result.rows.map(row => ({
      id: row.ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      updatedAt: row.UPDATED_AT,
    })))
  } catch (err) { next(err) }
  finally { await conn.close() }
})

router.get('/:id', async (req, res, next) => {
  const conn = await getConnection()
  try {
    const result = await conn.execute(
      `SELECT id, name, description, grapes_json, html_cache, data_query FROM report_templates WHERE id = :id`,
      [Number(req.params.id)]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
    const row = result.rows[0]
    res.json({
      id: row.ID,
      name: row.NAME,
      description: row.DESCRIPTION,
      grapes_json: row.GRAPES_JSON,
      html_cache: row.HTML_CACHE,
      data_query: row.DATA_QUERY,
    })
  } catch (err) { next(err) }
  finally { await conn.close() }
})

router.post('/', async (req, res, next) => {
  const { name, description = '', grapes_json, html_cache = '', data_query = '' } = req.body
  if (!name || !grapes_json) return res.status(400).json({ error: 'name and grapes_json are required' })
  const conn = await getConnection()
  try {
    const result = await conn.execute(
      `INSERT INTO report_templates (name, description, grapes_json, html_cache, data_query)
       VALUES (:1, :2, :3, :4, :5) RETURNING id INTO :6`,
      [name, description, grapes_json, html_cache, data_query, { type: 'NUMBER', dir: 'BIND_OUT' }]
    )
    await conn.commit()
    const id = result.outBinds[0][0]
    res.status(201).json({ id, name })
  } catch (err) { next(err) }
  finally { await conn.close() }
})

router.put('/:id', async (req, res, next) => {
  const { name, description = '', grapes_json, html_cache = '', data_query = '' } = req.body
  if (!name || !grapes_json) return res.status(400).json({ error: 'name and grapes_json are required' })
  const conn = await getConnection()
  try {
    const result = await conn.execute(
      `UPDATE report_templates
       SET name=:1, description=:2, grapes_json=:3, html_cache=:4, data_query=:5, updated_at=SYSTIMESTAMP
       WHERE id=:6`,
      [name, description, grapes_json, html_cache, data_query, Number(req.params.id)]
    )
    await conn.commit()
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ id: Number(req.params.id), name })
  } catch (err) { next(err) }
  finally { await conn.close() }
})

router.delete('/:id', async (req, res, next) => {
  const conn = await getConnection()
  try {
    const result = await conn.execute(
      `DELETE FROM report_templates WHERE id = :id`,
      [Number(req.params.id)]
    )
    await conn.commit()
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' })
    res.status(204).send()
  } catch (err) { next(err) }
  finally { await conn.close() }
})

module.exports = router
