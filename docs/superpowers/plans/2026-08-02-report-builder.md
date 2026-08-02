# Report Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual report designer (React + GrapesJS) with a Node.js REST API that Oracle APEX calls to render templates as PDF or HTML.

**Architecture:** Monorepo with npm workspaces — `packages/api` is an Express server that serves the builder SPA as static files and exposes all REST endpoints. `packages/builder` is a React + GrapesJS SPA that builds to `packages/builder/dist`. Templates are stored in Oracle DB; PDF rendering uses Puppeteer, HTML uses Handlebars.

**Tech Stack:** Node.js 20 LTS, React 18, GrapesJS 0.21, Express 4, oracledb 6, Puppeteer 22, Handlebars 4, Vite 5, Jest 29, Supertest 6, Axios 1

## Global Constraints

- Node.js >= 20 LTS required (Puppeteer 22 requirement)
- All API routes prefixed with `/api/`
- Oracle credentials always read from `.env` — never hardcoded
- GrapesJS editor saves both `grapes_json` (full editor state) and `html_cache` (rendered HTML+CSS) on every save
- Handlebars syntax for template variables: `{{fieldName}}` and `{{#each rows}}...{{/each}}`
- Puppeteer runs a single shared browser instance — one page per request, page closed after render
- No authentication — internal network only

---

## File Structure

```
C:\ADS\relatoolrio\
├── package.json                          # npm workspaces root
├── .env                                  # Oracle credentials + PORT (gitignored)
├── .env.example                          # env template committed to git
├── .gitignore
│
├── packages/
│   ├── api/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js                  # entry: starts server, inits browser
│   │   │   ├── app.js                    # Express app factory (exported for tests)
│   │   │   ├── db.js                     # oracledb connection pool singleton
│   │   │   ├── browser.js                # Puppeteer browser singleton
│   │   │   ├── renderer.js               # renderHtml() and renderPdf() functions
│   │   │   ├── routes/
│   │   │   │   ├── templates.js          # GET/POST/PUT/DELETE /api/templates
│   │   │   │   ├── data.js               # POST /api/data/query
│   │   │   │   └── render.js             # POST /api/render/:id
│   │   │   └── middleware/
│   │   │       └── errorHandler.js       # centralized Express error handler
│   │   ├── migrations/
│   │   │   └── 001_create_tables.sql     # DDL for report_templates + report_renders
│   │   └── tests/
│   │       ├── templates.test.js
│   │       ├── data.test.js
│   │       ├── render.test.js
│   │       └── renderer.test.js
│   │
│   └── builder/
│       ├── package.json
│       ├── vite.config.js
│       ├── index.html
│       └── src/
│           ├── main.jsx                  # React entry point
│           ├── App.jsx                   # root layout: TemplateList + Editor + Toolbar
│           ├── api/
│           │   ├── client.js             # Axios instance
│           │   ├── templates.js          # template API calls
│           │   └── data.js               # data query API call
│           ├── blocks/
│           │   ├── index.js              # registerBlocks(editor)
│           │   ├── TextField.js
│           │   ├── DataTable.js
│           │   ├── ReportImage.js
│           │   └── PageBreak.js
│           └── components/
│               ├── Editor.jsx            # GrapesJS wrapper, exposes getData() via ref
│               ├── TemplateList.jsx      # sidebar: list + create + delete templates
│               └── Toolbar.jsx           # bottom bar: name, SQL, Save, Preview
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "relatoolrio",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/api",
    "packages/builder"
  ],
  "scripts": {
    "dev:api": "npm run dev --workspace=packages/api",
    "dev:builder": "npm run dev --workspace=packages/builder",
    "build": "npm run build --workspace=packages/builder",
    "start": "npm run start --workspace=packages/api",
    "test": "npm run test --workspace=packages/api"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
packages/builder/dist/
.env
*.log
.DS_Store
```

- [ ] **Step 3: Create .env.example**

```
PORT=3000
ORACLE_USER=your_user
ORACLE_PASSWORD=your_password
ORACLE_CONNECT_STRING=localhost:1521/XEPDB1
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=10
```

- [ ] **Step 4: Create packages/api and packages/builder directories**

```bash
mkdir -p packages/api/src/routes packages/api/src/middleware packages/api/migrations packages/api/tests
mkdir -p packages/builder/src/api packages/builder/src/blocks packages/builder/src/components
```

- [ ] **Step 5: Commit**

```bash
git init
git add package.json .gitignore .env.example
git commit -m "chore: monorepo scaffold with npm workspaces"
```

---

## Task 2: API — Express app setup

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/src/app.js`
- Create: `packages/api/src/index.js`
- Test: `packages/api/tests/health.test.js`

**Produces:** `createApp()` — Express app factory used by tests and server entry

- [ ] **Step 1: Create packages/api/package.json**

```json
{
  "name": "@relatoolrio/api",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "express": "^4.19.2",
    "handlebars": "^4.7.8",
    "oracledb": "^6.4.0",
    "puppeteer": "^22.12.0",
    "dotenv": "^16.4.5",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

- [ ] **Step 2: Install API dependencies**

```bash
cd packages/api && npm install
```

- [ ] **Step 3: Write the failing health check test**

Create `packages/api/tests/health.test.js`:

```js
const request = require('supertest')
const { createApp } = require('../src/app')

describe('GET /health', () => {
  let app
  beforeAll(() => { app = createApp() })

  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd packages/api && npm test -- --testPathPattern=health
```

Expected: FAIL — `Cannot find module '../src/app'`

- [ ] **Step 5: Create packages/api/src/app.js**

```js
'use strict'
require('dotenv').config()
const express = require('express')
const cors = require('cors')

function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (req, res) => res.json({ status: 'ok' }))

  return app
}

module.exports = { createApp }
```

- [ ] **Step 6: Create packages/api/src/index.js**

```js
'use strict'
const { createApp } = require('./app')

const PORT = process.env.PORT || 3000
const app = createApp()

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd packages/api && npm test -- --testPathPattern=health
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/api/
git commit -m "feat: API Express app scaffold with health check"
```

---

## Task 3: API — Oracle DB connection pool

**Files:**
- Create: `packages/api/src/db.js`
- Test: inline in Task 5 (mocked)

**Produces:** `getConnection()` — returns a pooled Oracle connection; `closePool()` — closes on shutdown

- [ ] **Step 1: Create packages/api/src/db.js**

```js
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
```

- [ ] **Step 2: Update packages/api/src/index.js to init pool on startup**

```js
'use strict'
const { createApp } = require('./app')
const { initPool, closePool } = require('./db')

const PORT = process.env.PORT || 3000

async function start() {
  await initPool()
  const app = createApp()
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
  })

  process.on('SIGTERM', async () => {
    server.close()
    await closePool()
  })
}

start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/db.js packages/api/src/index.js
git commit -m "feat: Oracle DB connection pool with oracledb"
```

---

## Task 4: Database migration

**Files:**
- Create: `packages/api/migrations/001_create_tables.sql`
- Create: `packages/api/src/migrate.js`

- [ ] **Step 1: Create packages/api/migrations/001_create_tables.sql**

```sql
CREATE TABLE report_templates (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR2(200)  NOT NULL,
  description VARCHAR2(1000),
  grapes_json CLOB           NOT NULL,
  html_cache  CLOB,
  data_query  CLOB,
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at  TIMESTAMP DEFAULT SYSTIMESTAMP
);

CREATE TABLE report_renders (
  id          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_id NUMBER REFERENCES report_templates(id) ON DELETE SET NULL,
  format      VARCHAR2(10),
  rendered_at TIMESTAMP DEFAULT SYSTIMESTAMP,
  caller      VARCHAR2(200)
);
```

- [ ] **Step 2: Create packages/api/src/migrate.js**

```js
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
```

- [ ] **Step 3: Add migrate script to packages/api/package.json scripts**

```json
"scripts": {
  "dev": "node --watch src/index.js",
  "start": "node src/index.js",
  "test": "jest --runInBand",
  "migrate": "node src/migrate.js"
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/migrations/ packages/api/src/migrate.js packages/api/package.json
git commit -m "feat: Oracle DB migration script for report_templates and report_renders"
```

---

## Task 5: API — Templates CRUD routes

**Files:**
- Create: `packages/api/src/routes/templates.js`
- Modify: `packages/api/src/app.js`
- Test: `packages/api/tests/templates.test.js`

**Interfaces:**
- Consumes: `getConnection()` from `../db`
- Produces: Express router mounted at `/api/templates`

- [ ] **Step 1: Write failing tests**

Create `packages/api/tests/templates.test.js`:

```js
const request = require('supertest')
const { createApp } = require('../src/app')

jest.mock('../src/db', () => {
  const rows = []
  let nextId = 1

  const mockConn = {
    execute: jest.fn(async (sql, params = []) => {
      const s = sql.trim().toUpperCase()
      if (s.startsWith('SELECT') && s.includes('REPORT_TEMPLATES')) {
        if (params[0] !== undefined) {
          const row = rows.find(r => r.ID === params[0])
          return { rows: row ? [row] : [] }
        }
        return { rows }
      }
      if (s.startsWith('INSERT')) {
        const id = nextId++
        const row = {
          ID: id,
          NAME: params[0],
          DESCRIPTION: params[1],
          GRAPES_JSON: params[2],
          HTML_CACHE: params[3],
          DATA_QUERY: params[4],
        }
        rows.push(row)
        return { rows: [{ ID: id }] }
      }
      if (s.startsWith('UPDATE')) {
        const row = rows.find(r => r.ID === params[params.length - 1])
        if (row) {
          row.NAME = params[0]
          row.DESCRIPTION = params[1]
          row.GRAPES_JSON = params[2]
          row.HTML_CACHE = params[3]
          row.DATA_QUERY = params[4]
        }
        return { rowsAffected: row ? 1 : 0 }
      }
      if (s.startsWith('DELETE')) {
        const idx = rows.findIndex(r => r.ID === params[0])
        if (idx !== -1) rows.splice(idx, 1)
        return { rowsAffected: idx !== -1 ? 1 : 0 }
      }
      return { rows: [] }
    }),
    commit: jest.fn(),
    close: jest.fn(),
  }

  return { getConnection: jest.fn(async () => mockConn) }
})

describe('Templates API', () => {
  let app
  beforeAll(() => { app = createApp() })

  it('GET /api/templates returns empty array initially', async () => {
    const res = await request(app).get('/api/templates')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST /api/templates creates a template', async () => {
    const res = await request(app)
      .post('/api/templates')
      .send({ name: 'Invoice', description: 'Test', grapes_json: '{}', html_cache: '<p>hi</p>', data_query: 'SELECT 1 FROM dual' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
  })

  it('GET /api/templates/:id returns the template', async () => {
    const create = await request(app)
      .post('/api/templates')
      .send({ name: 'Report2', grapes_json: '{}', html_cache: '<p>x</p>' })
    const id = create.body.id
    const res = await request(app).get(`/api/templates/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Report2')
  })

  it('GET /api/templates/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/templates/9999')
    expect(res.status).toBe(404)
  })

  it('PUT /api/templates/:id updates name', async () => {
    const create = await request(app)
      .post('/api/templates')
      .send({ name: 'Old', grapes_json: '{}', html_cache: '<p>x</p>' })
    const id = create.body.id
    const res = await request(app)
      .put(`/api/templates/${id}`)
      .send({ name: 'New', grapes_json: '{}', html_cache: '<p>x</p>' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New')
  })

  it('DELETE /api/templates/:id removes it', async () => {
    const create = await request(app)
      .post('/api/templates')
      .send({ name: 'ToDelete', grapes_json: '{}', html_cache: '<p>x</p>' })
    const id = create.body.id
    const del = await request(app).delete(`/api/templates/${id}`)
    expect(del.status).toBe(204)
    const get = await request(app).get(`/api/templates/${id}`)
    expect(get.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/api && npm test -- --testPathPattern=templates
```

Expected: FAIL — `Cannot find module '../src/routes/templates'`

- [ ] **Step 3: Create packages/api/src/routes/templates.js**

```js
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
```

- [ ] **Step 4: Mount router in packages/api/src/app.js**

```js
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
```

Note: The test mock simulates Oracle's `RETURNING INTO` differently — the mock returns `{ rows: [{ ID: id }] }`. Adjust the mock's INSERT handler to match the route's `result.outBinds[0][0]` access by returning `{ outBinds: [[id]] }` instead:

Update the mock's INSERT branch in `templates.test.js`:

```js
if (s.startsWith('INSERT')) {
  const id = nextId++
  rows.push({ ID: id, NAME: params[0], DESCRIPTION: params[1],
    GRAPES_JSON: params[2], HTML_CACHE: params[3], DATA_QUERY: params[4] })
  return { outBinds: [[id]] }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/api && npm test -- --testPathPattern=templates
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/templates.js packages/api/src/app.js packages/api/tests/templates.test.js
git commit -m "feat: templates CRUD REST endpoints"
```

---

## Task 6: API — Data query route

**Files:**
- Create: `packages/api/src/routes/data.js`
- Modify: `packages/api/src/app.js`
- Test: `packages/api/tests/data.test.js`

**Interfaces:**
- Consumes: `getConnection()` from `../db`
- Produces: Express router mounted at `/api/data`

- [ ] **Step 1: Write failing test**

Create `packages/api/tests/data.test.js`:

```js
const request = require('supertest')
const { createApp } = require('../src/app')

jest.mock('../src/db', () => ({
  getConnection: jest.fn(async () => ({
    execute: jest.fn(async (sql) => ({
      metaData: [{ name: 'ID' }, { name: 'NAME' }],
      rows: [{ ID: 1, NAME: 'ACME' }],
    })),
    close: jest.fn(),
  })),
}))

describe('POST /api/data/query', () => {
  let app
  beforeAll(() => { app = createApp() })

  it('returns rows from a SQL query', async () => {
    const res = await request(app)
      .post('/api/data/query')
      .send({ sql: 'SELECT id, name FROM customers' })
    expect(res.status).toBe(200)
    expect(res.body.rows).toHaveLength(1)
    expect(res.body.rows[0]).toEqual({ ID: 1, NAME: 'ACME' })
    expect(res.body.columns).toEqual(['ID', 'NAME'])
  })

  it('returns 400 when sql is missing', async () => {
    const res = await request(app).post('/api/data/query').send({})
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/api && npm test -- --testPathPattern=data
```

Expected: FAIL — `Cannot find module '../src/routes/data'`

- [ ] **Step 3: Create packages/api/src/routes/data.js**

```js
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
```

- [ ] **Step 4: Mount in packages/api/src/app.js**

Add after the templates router line:

```js
const dataRouter = require('./routes/data')
// ...
app.use('/api/data', dataRouter)
```

Full updated `app.js`:

```js
'use strict'
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const templatesRouter = require('./routes/templates')
const dataRouter = require('./routes/data')

function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (req, res) => res.json({ status: 'ok' }))
  app.use('/api/templates', templatesRouter)
  app.use('/api/data', dataRouter)

  return app
}

module.exports = { createApp }
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/api && npm test -- --testPathPattern=data
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/data.js packages/api/src/app.js packages/api/tests/data.test.js
git commit -m "feat: data query route for builder preview"
```

---

## Task 7: API — Renderer (HTML + PDF)

**Files:**
- Create: `packages/api/src/browser.js`
- Create: `packages/api/src/renderer.js`
- Test: `packages/api/tests/renderer.test.js`

**Interfaces:**
- Produces:
  - `renderHtml(htmlCache, data)` → `string` (compiled HTML document)
  - `renderPdf(htmlCache, data)` → `Buffer` (PDF bytes)
  - `initBrowser()` — call once at startup
  - `closeBrowser()` — call on shutdown

- [ ] **Step 1: Write failing tests**

Create `packages/api/tests/renderer.test.js`:

```js
const { renderHtml } = require('../src/renderer')

jest.mock('../src/browser', () => ({}))

describe('renderHtml', () => {
  it('compiles handlebars variables', () => {
    const result = renderHtml('<p>{{name}}</p>', { name: 'ACME' })
    expect(result).toContain('<p>ACME</p>')
    expect(result).toContain('<!DOCTYPE html>')
  })

  it('compiles handlebars each loops', () => {
    const result = renderHtml(
      '<ul>{{#each rows}}<li>{{item}}</li>{{/each}}</ul>',
      { rows: [{ item: 'Alpha' }, { item: 'Beta' }] }
    )
    expect(result).toContain('<li>Alpha</li>')
    expect(result).toContain('<li>Beta</li>')
  })

  it('returns wrapped HTML document', () => {
    const result = renderHtml('<p>hello</p>', {})
    expect(result).toContain('<html>')
    expect(result).toContain('<body>')
    expect(result).toContain('<p>hello</p>')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/api && npm test -- --testPathPattern=renderer
```

Expected: FAIL — `Cannot find module '../src/renderer'`

- [ ] **Step 3: Create packages/api/src/browser.js**

```js
'use strict'
const puppeteer = require('puppeteer')

let browser

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

async function getBrowser() {
  if (!browser) throw new Error('Browser not initialized. Call initBrowser() first.')
  return browser
}

async function closeBrowser() {
  if (browser) await browser.close()
}

module.exports = { initBrowser, getBrowser, closeBrowser }
```

- [ ] **Step 4: Create packages/api/src/renderer.js**

```js
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/api && npm test -- --testPathPattern=renderer
```

Expected: PASS (3 tests)

- [ ] **Step 6: Update packages/api/src/index.js to init and close browser**

```js
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
```

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/browser.js packages/api/src/renderer.js packages/api/src/index.js packages/api/tests/renderer.test.js
git commit -m "feat: HTML and PDF renderer with Puppeteer and Handlebars"
```

---

## Task 8: API — Render route

**Files:**
- Create: `packages/api/src/routes/render.js`
- Modify: `packages/api/src/app.js`
- Test: `packages/api/tests/render.test.js`

**Interfaces:**
- Consumes: `getConnection()` from `../db`, `renderHtml()` and `renderPdf()` from `../renderer`
- Produces: Express router mounted at `/api/render`

- [ ] **Step 1: Write failing tests**

Create `packages/api/tests/render.test.js`:

```js
const request = require('supertest')
const { createApp } = require('../src/app')

jest.mock('../src/db', () => ({
  getConnection: jest.fn(async () => ({
    execute: jest.fn(async (sql, params) => {
      if (sql.includes('report_templates') && params[0] === 1) {
        return { rows: [{ ID: 1, NAME: 'Test', HTML_CACHE: '<p>Hello {{name}}</p>' }] }
      }
      if (sql.includes('report_renders')) return { rows: [] }
      return { rows: [] }
    }),
    commit: jest.fn(),
    close: jest.fn(),
  })),
}))

jest.mock('../src/renderer', () => ({
  renderHtml: jest.fn((html, data) => `<html><body>${html.replace('{{name}}', data.name)}</body></html>`),
  renderPdf: jest.fn(async (html, data) => Buffer.from('PDF_CONTENT')),
}))

describe('POST /api/render/:id', () => {
  let app
  beforeAll(() => { app = createApp() })

  it('renders HTML format', async () => {
    const res = await request(app)
      .post('/api/render/1')
      .send({ format: 'html', data: { name: 'World' } })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.text).toContain('World')
  })

  it('renders PDF format', async () => {
    const res = await request(app)
      .post('/api/render/1')
      .send({ format: 'pdf', data: { name: 'World' } })
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/pdf/)
  })

  it('returns 404 for unknown template', async () => {
    const res = await request(app)
      .post('/api/render/9999')
      .send({ format: 'html', data: {} })
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid format', async () => {
    const res = await request(app)
      .post('/api/render/1')
      .send({ format: 'excel', data: {} })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/api && npm test -- --testPathPattern=render.test
```

Expected: FAIL — `Cannot find module '../src/routes/render'`

- [ ] **Step 3: Create packages/api/src/routes/render.js**

```js
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
```

- [ ] **Step 4: Mount render router in packages/api/src/app.js**

```js
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/api && npm test -- --testPathPattern=render.test
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/render.js packages/api/src/app.js packages/api/tests/render.test.js
git commit -m "feat: render route for PDF and HTML output"
```

---

## Task 9: API — Static file serving + error handler

**Files:**
- Create: `packages/api/src/middleware/errorHandler.js`
- Modify: `packages/api/src/app.js`

- [ ] **Step 1: Create packages/api/src/middleware/errorHandler.js**

```js
'use strict'

function errorHandler(err, req, res, next) {
  console.error(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
}

module.exports = errorHandler
```

- [ ] **Step 2: Update packages/api/src/app.js to serve static files and add error handler**

```js
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
```

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
cd packages/api && npm test
```

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/middleware/errorHandler.js packages/api/src/app.js
git commit -m "feat: static file serving and centralized error handler"
```

---

## Task 10: Builder — Vite + React setup

**Files:**
- Create: `packages/builder/package.json`
- Create: `packages/builder/vite.config.js`
- Create: `packages/builder/index.html`
- Create: `packages/builder/src/main.jsx`
- Create: `packages/builder/src/App.jsx`

- [ ] **Step 1: Create packages/builder/package.json**

```json
{
  "name": "@relatoolrio/builder",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "grapesjs": "^0.21.13",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.3"
  }
}
```

- [ ] **Step 2: Install builder dependencies**

```bash
cd packages/builder && npm install
```

- [ ] **Step 3: Create packages/builder/vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
})
```

- [ ] **Step 4: Create packages/builder/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Report Builder</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; background: #f5f5f5; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create packages/builder/src/main.jsx**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

- [ ] **Step 6: Create packages/builder/src/App.jsx (placeholder)**

```jsx
export default function App() {
  return <div style={{ padding: 24 }}>Report Builder loading...</div>
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
cd packages/builder && npm run dev
```

Expected: Vite dev server starts, browser shows "Report Builder loading..."

- [ ] **Step 8: Commit**

```bash
git add packages/builder/
git commit -m "feat: builder Vite + React scaffold"
```

---

## Task 11: Builder — API client

**Files:**
- Create: `packages/builder/src/api/client.js`
- Create: `packages/builder/src/api/templates.js`
- Create: `packages/builder/src/api/data.js`

**Produces:**
- `listTemplates()` → `Promise<Array<{id, name, description, updatedAt}>>`
- `getTemplate(id)` → `Promise<{id, name, grapes_json, html_cache, data_query}>`
- `createTemplate(payload)` → `Promise<{id, name}>`
- `updateTemplate(id, payload)` → `Promise<{id, name}>`
- `deleteTemplate(id)` → `Promise<void>`
- `runQuery(sql)` → `Promise<{columns, rows}>`

- [ ] **Step 1: Create packages/builder/src/api/client.js**

```js
import axios from 'axios'

const client = axios.create({ baseURL: '/api' })
export default client
```

- [ ] **Step 2: Create packages/builder/src/api/templates.js**

```js
import client from './client'

export const listTemplates = () =>
  client.get('/templates').then(r => r.data)

export const getTemplate = (id) =>
  client.get(`/templates/${id}`).then(r => r.data)

export const createTemplate = (payload) =>
  client.post('/templates', payload).then(r => r.data)

export const updateTemplate = (id, payload) =>
  client.put(`/templates/${id}`, payload).then(r => r.data)

export const deleteTemplate = (id) =>
  client.delete(`/templates/${id}`)
```

- [ ] **Step 3: Create packages/builder/src/api/data.js**

```js
import client from './client'

export const runQuery = (sql) =>
  client.post('/data/query', { sql }).then(r => r.data)
```

- [ ] **Step 4: Commit**

```bash
git add packages/builder/src/api/
git commit -m "feat: builder API client for templates and data"
```

---

## Task 12: Builder — GrapesJS blocks

**Files:**
- Create: `packages/builder/src/blocks/TextField.js`
- Create: `packages/builder/src/blocks/DataTable.js`
- Create: `packages/builder/src/blocks/ReportImage.js`
- Create: `packages/builder/src/blocks/PageBreak.js`
- Create: `packages/builder/src/blocks/index.js`

**Produces:** `registerBlocks(editor)` — registers all 4 custom blocks into a GrapesJS editor instance

- [ ] **Step 1: Create packages/builder/src/blocks/TextField.js**

```js
export function registerTextField(editor) {
  editor.Blocks.add('text-field', {
    label: 'Text Field',
    category: 'Report',
    content: '<span data-gjs-editable="true">{{field_name}}</span>',
    attributes: { title: 'Insert a Handlebars variable like {{customer_name}}' },
  })
}
```

- [ ] **Step 2: Create packages/builder/src/blocks/DataTable.js**

```js
export function registerDataTable(editor) {
  editor.Blocks.add('data-table', {
    label: 'Data Table',
    category: 'Report',
    content: `
<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    {{#each rows}}
    <tr>
      <td>{{col1}}</td>
      <td>{{col2}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>`,
  })
}
```

- [ ] **Step 3: Create packages/builder/src/blocks/ReportImage.js**

```js
export function registerReportImage(editor) {
  editor.Blocks.add('report-image', {
    label: 'Image',
    category: 'Report',
    content: '<img src="{{image_url}}" style="max-width:100%;" alt="" />',
  })
}
```

- [ ] **Step 4: Create packages/builder/src/blocks/PageBreak.js**

```js
export function registerPageBreak(editor) {
  editor.Blocks.add('page-break', {
    label: 'Page Break',
    category: 'Report',
    content: '<div style="page-break-before:always; height:2px; background:#e0e0e0; margin:12px 0;" data-label="Page Break"></div>',
  })
}
```

- [ ] **Step 5: Create packages/builder/src/blocks/index.js**

```js
import { registerTextField } from './TextField'
import { registerDataTable } from './DataTable'
import { registerReportImage } from './ReportImage'
import { registerPageBreak } from './PageBreak'

export function registerBlocks(editor) {
  registerTextField(editor)
  registerDataTable(editor)
  registerReportImage(editor)
  registerPageBreak(editor)
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/builder/src/blocks/
git commit -m "feat: custom GrapesJS report blocks (TextField, DataTable, Image, PageBreak)"
```

---

## Task 13: Builder — Editor component

**Files:**
- Create: `packages/builder/src/components/Editor.jsx`

**Produces:** `<Editor ref={ref} template={template} />` — GrapesJS canvas; `ref.current.getData()` returns `{ grapes_json, html_cache }`

- [ ] **Step 1: Create packages/builder/src/components/Editor.jsx**

```jsx
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import { registerBlocks } from '../blocks'

const Editor = forwardRef(function Editor({ template }, ref) {
  const containerRef = useRef(null)
  const editorRef = useRef(null)

  useImperativeHandle(ref, () => ({
    getData() {
      const editor = editorRef.current
      if (!editor) return null
      const css = editor.getCss()
      const html = editor.getHtml()
      return {
        grapes_json: JSON.stringify(editor.getProjectData()),
        html_cache: css ? `<style>${css}</style>${html}` : html,
      }
    },
  }))

  useEffect(() => {
    const editor = grapesjs.init({
      container: containerRef.current,
      fromElement: false,
      height: '100%',
      storageManager: false,
      panels: { defaults: [] },
    })
    registerBlocks(editor)
    editorRef.current = editor
    return () => editor.destroy()
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (template?.grapes_json) {
      try {
        editor.loadProjectData(JSON.parse(template.grapes_json))
      } catch {
        editor.setComponents('')
        editor.setStyle('')
      }
    } else {
      editor.setComponents('')
      editor.setStyle('')
    }
  }, [template?.id])

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, height: '100%', overflow: 'hidden' }}
    />
  )
})

export default Editor
```

- [ ] **Step 2: Commit**

```bash
git add packages/builder/src/components/Editor.jsx
git commit -m "feat: GrapesJS Editor React component with getData() ref"
```

---

## Task 14: Builder — TemplateList sidebar

**Files:**
- Create: `packages/builder/src/components/TemplateList.jsx`

**Produces:** `<TemplateList currentId={id} onSelect={fn} onCreated={fn} />` — sidebar listing templates with create and delete

- [ ] **Step 1: Create packages/builder/src/components/TemplateList.jsx**

```jsx
import { useEffect, useState } from 'react'
import { listTemplates, createTemplate, deleteTemplate } from '../api/templates'

const styles = {
  sidebar: { width: 220, borderRight: '1px solid #ddd', background: '#fff', display: 'flex', flexDirection: 'column' },
  header: { padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: 14 },
  list: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  item: (active) => ({
    padding: '8px 16px', cursor: 'pointer', fontSize: 13,
    background: active ? '#e8f0fe' : 'transparent',
    color: active ? '#1a73e8' : '#333',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  }),
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16, lineHeight: 1 },
  newBtn: { margin: 12, padding: '8px 0', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
}

export default function TemplateList({ currentId, onSelect, onCreated }) {
  const [templates, setTemplates] = useState([])

  async function load() {
    const data = await listTemplates()
    setTemplates(data)
  }

  useEffect(() => { load() }, [])

  async function handleNew() {
    const name = prompt('Template name:')
    if (!name) return
    const created = await createTemplate({ name, grapes_json: '{}', html_cache: '' })
    await load()
    onSelect({ id: created.id, name })
    onCreated?.()
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this template?')) return
    await deleteTemplate(id)
    await load()
    if (currentId === id) onSelect(null)
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>Templates</div>
      <div style={styles.list}>
        {templates.map(t => (
          <div key={t.id} style={styles.item(t.id === currentId)} onClick={() => onSelect(t)}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
            <button style={styles.deleteBtn} onClick={(e) => handleDelete(e, t.id)}>×</button>
          </div>
        ))}
      </div>
      <button style={styles.newBtn} onClick={handleNew}>+ New Template</button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/builder/src/components/TemplateList.jsx
git commit -m "feat: TemplateList sidebar with create and delete"
```

---

## Task 15: Builder — Toolbar (Save + Preview)

**Files:**
- Create: `packages/builder/src/components/Toolbar.jsx`

**Produces:** `<Toolbar template={template} getEditorData={fn} onSaved={fn} />` — bottom bar with name field, SQL field, Save and Preview buttons

- [ ] **Step 1: Create packages/builder/src/components/Toolbar.jsx**

```jsx
import { useState, useEffect } from 'react'
import { getTemplate, updateTemplate } from '../api/templates'

const styles = {
  bar: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fff', borderTop: '1px solid #ddd', height: 52 },
  input: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13 },
  btn: (color) => ({ padding: '6px 16px', background: color, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }),
  label: { fontSize: 12, color: '#666', marginRight: 4 },
  status: { fontSize: 12, color: '#888', marginLeft: 8 },
}

export default function Toolbar({ template, getEditorData, onSaved }) {
  const [name, setName] = useState('')
  const [dataQuery, setDataQuery] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!template) return
    setName(template.name || '')
    setDataQuery(template.data_query || '')
  }, [template?.id])

  async function handleSave() {
    if (!template) return
    const data = getEditorData()
    if (!data) return
    setStatus('Saving...')
    try {
      await updateTemplate(template.id, {
        name,
        grapes_json: data.grapes_json,
        html_cache: data.html_cache,
        data_query: dataQuery,
      })
      onSaved?.({ ...template, name, data_query: dataQuery })
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch {
      setStatus('Save failed')
    }
  }

  async function handlePreview() {
    if (!template) return
    const win = window.open('', '_blank')
    win.document.write('<p>Loading preview...</p>')
    try {
      let previewData = {}
      if (dataQuery) {
        try {
          const qRes = await fetch('/api/data/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: dataQuery }),
          })
          const { rows } = await qRes.json()
          previewData = { rows }
        } catch {
          // preview without data if SQL fails
        }
      }
      const res = await fetch(`/api/render/${template.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'html', data: previewData, caller: 'builder-preview' }),
      })
      const html = await res.text()
      win.document.open()
      win.document.write(html)
      win.document.close()
    } catch {
      win.document.write('<p>Preview failed.</p>')
    }
  }

  if (!template) {
    return <div style={styles.bar}><span style={styles.label}>Select or create a template to start</span></div>
  }

  return (
    <div style={styles.bar}>
      <span style={styles.label}>Name:</span>
      <input style={{ ...styles.input, width: 180 }} value={name} onChange={e => setName(e.target.value)} />
      <span style={styles.label}>Default SQL:</span>
      <input style={{ ...styles.input, flex: 1 }} value={dataQuery} onChange={e => setDataQuery(e.target.value)} placeholder="SELECT * FROM table WHERE id = :id" />
      <button style={styles.btn('#1a73e8')} onClick={handleSave}>Save</button>
      <button style={styles.btn('#34a853')} onClick={handlePreview}>Preview</button>
      {status && <span style={styles.status}>{status}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/builder/src/components/Toolbar.jsx
git commit -m "feat: Toolbar with Save and Preview actions"
```

---

## Task 16: Builder — App assembly

**Files:**
- Modify: `packages/builder/src/App.jsx`

- [ ] **Step 1: Replace packages/builder/src/App.jsx with full layout**

```jsx
import { useState, useRef, useEffect } from 'react'
import Editor from './components/Editor'
import TemplateList from './components/TemplateList'
import Toolbar from './components/Toolbar'
import { getTemplate } from './api/templates'

export default function App() {
  const [currentTemplate, setCurrentTemplate] = useState(null)
  const editorRef = useRef(null)

  async function handleSelect(t) {
    if (!t) { setCurrentTemplate(null); return }
    const full = await getTemplate(t.id)
    setCurrentTemplate(full)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TemplateList
          currentId={currentTemplate?.id}
          onSelect={handleSelect}
        />
        <Editor ref={editorRef} template={currentTemplate} />
      </div>
      <Toolbar
        template={currentTemplate}
        getEditorData={() => editorRef.current?.getData()}
        onSaved={setCurrentTemplate}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run the builder dev server and verify the full UI**

```bash
cd packages/builder && npm run dev
```

Open http://localhost:5173. Verify:
- Sidebar shows "Templates" panel with a "+ New Template" button
- Clicking "+ New Template" prompts for a name (will fail to save without API running — that's expected)
- GrapesJS canvas fills the center area with block palette on the left
- Toolbar appears at the bottom with Name, SQL, Save, Preview

- [ ] **Step 3: Commit**

```bash
git add packages/builder/src/App.jsx
git commit -m "feat: App layout wires TemplateList, Editor, and Toolbar together"
```

---

## Task 17: Integration — Build and smoke test

**Files:**
- Modify: `packages/api/package.json` (add postinstall / ensure path is correct)

- [ ] **Step 1: Build the builder**

```bash
cd packages/builder && npm run build
```

Expected: `packages/builder/dist/` is created with `index.html` and assets.

- [ ] **Step 2: Run all API tests one final time**

```bash
cd packages/api && npm test
```

Expected: All tests PASS

- [ ] **Step 3: Run the migration against your Oracle DB**

Copy `.env.example` to `.env` and fill in your Oracle credentials, then:

```bash
cd packages/api && npm run migrate
```

Expected output:
```
OK: CREATE TABLE report_templates
OK: CREATE TABLE report_renders
```

- [ ] **Step 4: Start the API server**

```bash
cd packages/api && npm start
```

Expected: `API listening on http://localhost:3000`

- [ ] **Step 5: Smoke test the full flow**

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Create a template
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","grapes_json":"{}","html_cache":"<p>Hello {{name}}</p>"}'
# Expected: {"id":1,"name":"Test"}

# Render as HTML
curl -X POST http://localhost:3000/api/render/1 \
  -H "Content-Type: application/json" \
  -d '{"format":"html","data":{"name":"World"}}'
# Expected: HTML with "Hello World"

# Render as PDF (saves to file)
curl -X POST http://localhost:3000/api/render/1 \
  -H "Content-Type: application/json" \
  -d '{"format":"pdf","data":{"name":"World"}}' \
  --output test.pdf
# Expected: test.pdf created, opens in PDF viewer
```

- [ ] **Step 6: Open the builder UI**

Navigate to http://localhost:3000. Verify:
- Builder SPA loads (served from `builder/dist`)
- Create a template, drag blocks onto canvas, save, preview

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: complete report builder — builder SPA + render API integrated"
```
