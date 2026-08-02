export function registerPageBreak(editor) {
  editor.Blocks.add('page-break', {
    label: 'Page Break',
    category: 'Report',
    content: '<div style="page-break-before:always; height:2px; background:#e0e0e0; margin:12px 0;" data-label="Page Break"></div>',
  })
}
