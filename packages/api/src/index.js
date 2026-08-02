'use strict'
const { createApp } = require('./app')
const { initPool, closePool } = require('./db')
const { initBrowser, closeBrowser } = require('./browser')

const PORT = process.env.PORT || 3000

async function start() {
  await initPool()
  await initBrowser()
  const app = createApp()
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
  })

  process.on('SIGTERM', async () => {
    server.close()
    await closeBrowser()
    await closePool()
  })
}

start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
