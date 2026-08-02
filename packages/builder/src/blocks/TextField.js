export function registerTextField(editor) {
  editor.Blocks.add('text-field', {
    label: 'Text Field',
    category: 'Report',
    content: {
      tagName: 'div',
      content: '{{field_name}}',
      resizable: { cr: 1, bc: 1, br: 1 },
      style: { 'font-size': '14px', 'padding': '2px 0', 'min-height': '1.4em', 'min-width': '80px' },
    },
    attributes: { title: 'Insert a Handlebars variable like {{customer_name}}' },
  })
}
