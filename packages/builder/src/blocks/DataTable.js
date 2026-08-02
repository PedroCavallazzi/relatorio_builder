export function registerDataTable(editor) {
  editor.Blocks.add('data-table', {
    label: 'Data Table',
    category: 'Report',
    content: `
<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    {{#each rows}}
    <tr>
      <td>{{col1}}</td>
      <td>{{col2}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>`,
  })
}
