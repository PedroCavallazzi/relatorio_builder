export function registerLayout(editor) {
  function col() {
    return {
      tagName: 'div',
      attributes: { class: 'gjs-col' },
      resizable: { tl: 0, tc: 0, tr: 0, cl: 0, cr: 1, bl: 0, bc: 0, br: 0 },
      draggable: false,
      droppable: true,
      style: {
        flex: '1',
        'min-width': '20px',
        'min-height': '60px',
        padding: '8px',
        'box-sizing': 'border-box',
      },
    }
  }

  function row(cols) {
    return {
      tagName: 'div',
      attributes: { class: 'gjs-row' },
      resizable: { tl: 0, tc: 0, tr: 0, cl: 0, cr: 0, bl: 0, bc: 1, br: 0 },
      droppable: false,
      style: {
        display: 'flex',
        width: '100%',
        'min-height': '80px',
        'margin-bottom': '4px',
        'box-sizing': 'border-box',
      },
      components: Array.from({ length: cols }, col),
    }
  }

  editor.Blocks.add('layout-1', {
    label: '1 Column',
    category: 'Layout',
    content: row(1),
    attributes: { title: 'Full-width row' },
  })

  editor.Blocks.add('layout-2', {
    label: '2 Columns',
    category: 'Layout',
    content: row(2),
    attributes: { title: 'Two equal columns' },
  })

  editor.Blocks.add('layout-3', {
    label: '3 Columns',
    category: 'Layout',
    content: row(3),
    attributes: { title: 'Three equal columns' },
  })
}
