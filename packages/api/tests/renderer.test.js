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
