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
