export function registerReportImage(editor) {
  editor.Blocks.add('report-image', {
    label: 'Image',
    category: 'Report',
    content: '<img src="{{image_url}}" style="max-width:100%;" alt="" />',
  })
}
