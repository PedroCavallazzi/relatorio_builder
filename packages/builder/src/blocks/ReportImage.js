export function registerReportImage(editor) {
  editor.Blocks.add('report-image', {
    label: 'Image',
    category: 'Report',
    content: {
      tagName: 'img',
      attributes: { src: '{{image_url}}', alt: '' },
      resizable: { cr: 1, bc: 1, br: 1, cl: 1, tl: 0, tc: 0, tr: 0, bl: 0 },
      style: { 'max-width': '100%' },
    },
  })
}
