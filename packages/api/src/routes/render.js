'use strict'
const { Router } = require('express')
const { getConnection } = require('../db')
const { renderHtml, renderPdf } = require('../renderer')

const router = Router()

router.post('/:id', async (req, res, next) => {
  const { format, data = {}, caller = '' } = req.body
  if (!['html', 'pdf'].includes(format)) {
    return res.status(400).json({ error: 'format must be "html" or "pdf"' })
  }

  const conn = await getConnection()
  try {
    const result = await conn.execute(
      `SELECT id, html_cache FROM report_templates WHERE id = :id`,
      [Number(req.params.id)]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Template not found' })

    const template = result.rows[0]
    const htmlCache = template.HTML_CACHE

    await conn.execute(
      `INSERT INTO report_renders (template_id, format, caller) VALUES (:1, :2, :3)`,
      [template.ID, format, caller]
    )
    await conn.commit()

    if (format === 'html') {
      const html = renderHtml(htmlCache, data)
      return res.type('html').send(html)
    }

    const pdf = await renderPdf(htmlCache, data)
    res.type('application/pdf').send(pdf)
  } catch (err) { next(err) }
  finally { await conn.close() }
})

module.exports = router
