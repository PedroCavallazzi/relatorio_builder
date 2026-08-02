'use strict'
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const templatesRouter = require('./routes/templates')

function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (req, res) => res.json({ status: 'ok' }))
  app.use('/api/templates', templatesRouter)

  return app
}

module.exports = { createApp }
