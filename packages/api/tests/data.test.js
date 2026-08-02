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
