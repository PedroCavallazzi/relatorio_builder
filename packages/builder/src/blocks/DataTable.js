export function registerDataTable(editor) {
  editor.Blocks.add('data-table', {
    label: 'Data Table',
    category: 'Report',
    content: `<div data-gjs-resizable='{"cr":1,"bc":1,"br":1}'>
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
</table>
</div>`,
  })
}
