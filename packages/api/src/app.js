'use strict'
require('dotenv').config()
const path = require('path')
const express = require('express')
const cors = require('cors')
const templatesRouter = require('./routes/templates')
const dataRouter = require('./routes/data')
const renderRouter = require('./routes/render')
const errorHandler = require('./middleware/errorHandler')

const BUILDER_DIST = path.join(__dirname, '../../builder/dist')

function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (req, res) => res.json({ status: 'ok' }))
  app.use('/api/templates', templatesRouter)
  app.use('/api/data', dataRouter)
  app.use('/api/render', renderRouter)

  app.use(express.static(BUILDER_DIST))
  app.get('*', (req, res) => res.sendFile(path.join(BUILDER_DIST, 'index.html')))

  app.use(errorHandler)

  return app
}

module.exports = { createApp }
