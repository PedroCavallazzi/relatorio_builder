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
        rows.push({ ID: id, NAME: params[0], DESCRIPTION: params[1],
          GRAPES_JSON: params[2], HTML_CACHE: params[3], DATA_QUERY: params[4] })
        return { outBinds: [[id]] }
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
