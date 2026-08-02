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
