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
