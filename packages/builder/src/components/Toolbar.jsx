import { useState, useEffect } from 'react'
import { updateTemplate } from '../api/templates'

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

  async function saveCurrentState() {
    const data = getEditorData()
    if (!data) return false
    await updateTemplate(template.id, {
      name,
      grapes_json: data.grapes_json,
      html_cache: data.html_cache,
      data_query: dataQuery,
    })
    return true
  }

  async function fetchPreviewData() {
    if (!dataQuery) return {}
    try {
      const res = await fetch('/api/data/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: dataQuery }),
      })
      const { rows } = await res.json()
      return { rows }
    } catch {
      return {}
    }
  }

  async function handlePreview() {
    if (!template) return
    const win = window.open('', '_blank')
    win.document.write('<p>Saving and loading preview...</p>')
    try {
      setStatus('Saving...')
      await saveCurrentState()
      setStatus('')
      const previewData = await fetchPreviewData()
      const res = await fetch(`/api/render/${template.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'html', data: previewData, caller: 'builder-preview' }),
      })
      const body = await res.text()
      const shell = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: #c8c8c8; min-height: 100%; }
  .a4-page {
    width: 794px; min-height: 1122px;
    background: #fff;
    margin: 32px auto;
    padding: 28px 28px;
    box-shadow: 0 4px 24px rgba(0,0,0,.3);
    box-sizing: border-box;
  }
  @media print { html, body { background: none; } .a4-page { margin: 0; box-shadow: none; padding: 0; } }
</style>
</head><body><div class="a4-page">${body}</div></body></html>`
      win.document.open()
      win.document.write(shell)
      win.document.close()
    } catch {
      win.document.write('<p>Preview failed.</p>')
    }
  }

  async function handlePreviewPdf() {
    if (!template) return
    try {
      setStatus('Saving...')
      await saveCurrentState()
      setStatus('Generating PDF...')
      const previewData = await fetchPreviewData()
      const res = await fetch(`/api/render/${template.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf', data: previewData, caller: 'builder-preview' }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setStatus('')
    } catch {
      setStatus('PDF preview failed')
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
      <button style={styles.btn('#e37400')} onClick={handlePreviewPdf}>Preview PDF</button>
      {status && <span style={styles.status}>{status}</span>}
    </div>
  )
}
