'use strict'
const Handlebars = require('handlebars')
const { getBrowser } = require('./browser')

function wrapHtml(body) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12pt; margin: 0; padding: 0; }
  @page { margin: 1cm; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ddd; padding: 6px 8px; }
</style>
</head>
<body>${body}</body>
</html>`
}

function renderHtml(htmlCache, data) {
  const compiled = Handlebars.compile(htmlCache)(data)
  return wrapHtml(compiled)
}

async function renderPdf(htmlCache, data) {
  const html = renderHtml(htmlCache, data)
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    })
    return pdf
  } finally {
    await page.close()
  }
}

module.exports = { renderHtml, renderPdf }
