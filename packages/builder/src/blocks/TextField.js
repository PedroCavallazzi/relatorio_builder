export function registerTextField(editor) {
  editor.Blocks.add('text-field', {
    label: 'Text Field',
    category: 'Report',
    content: '<span data-gjs-editable="true">{{field_name}}</span>',
    attributes: { title: 'Insert a Handlebars variable like {{customer_name}}' },
  })
}
