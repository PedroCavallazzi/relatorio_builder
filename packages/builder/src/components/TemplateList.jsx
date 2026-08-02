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
