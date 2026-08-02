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
      canvasCss: `
        .gjs-cv-canvas__frames { background: #c8c8c8; }
        .gjs-frame-wrapper {
          width: 794px !important;
          min-height: 1122px;
          background: #fff;
          box-shadow: 0 2px 12px rgba(0,0,0,.25);
          margin: 24px auto;
        }
      `,
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
