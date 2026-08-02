import { registerLayout } from './Layout'
import { registerTextField } from './TextField'
import { registerDataTable } from './DataTable'
import { registerReportImage } from './ReportImage'
import { registerPageBreak } from './PageBreak'

export function registerBlocks(editor) {
  registerLayout(editor)
  registerTextField(editor)
  registerDataTable(editor)
  registerReportImage(editor)
  registerPageBreak(editor)
}
