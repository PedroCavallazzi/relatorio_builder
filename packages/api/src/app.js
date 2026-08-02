'use strict'
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const templatesRouter = require('./routes/templates')
const dataRouter = require('./routes/data')
const renderRouter = require('./routes/render')

function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (req, res) => res.json({ status: 'ok' }))
  app.use('/api/templates', templatesRouter)
  app.use('/api/data', dataRouter)
  app.use('/api/render', renderRouter)

  return app
}

module.exports = { createApp }
