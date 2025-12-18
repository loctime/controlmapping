import { createSchemaFromMappings, validateExcelAgainstSchema, extractDataFromExcel } from '../types/excel-mapping'
import type { CellMapping, ExcelData } from '../types/excel'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('Assertion failed: ' + msg)
}

// Minimal mock ExcelData
const mockExcel: ExcelData = {
  fileName: 'mock.xlsx',
  sheets: [
    {
      name: 'Sheet1',
      rows: 10,
      cols: 5,
      cells: {
        A1: { value: 'ACME' },
        B1: { value: 123 },
        C1: { value: '' },
      },
      cellPositions: {
        A1: { row: 1, col: 1, rowSpan: 1, colSpan: 1, width: 50, height: 20, x: 0, y: 0 },
      },
    },
  ],
}

const mappings: CellMapping[] = [
  { id: 'm1', labelCell: 'A1', valueCell: 'B1', createdAt: new Date() },
  { id: 'm2', labelCell: 'B1', valueCell: 'C1', createdAt: new Date() },
  { id: 'm3', labelCell: 'C1', valueCell: 'A1', createdAt: new Date() },
]

// Test createSchemaFromMappings
const schema = createSchemaFromMappings(mappings, mockExcel, { schemaId: 's1', schemaName: 'TestSchema' })
console.log('Schema created:', schema.schemaId, 'fields:', schema.fields.length)
assert(schema.fields.length === 3, 'Expected 3 fields in schema')
assert(schema.fields.find((f) => f.labelCellRef === 'A1')?.valueCellRef === 'B1', 'Field 1 refs preserved')

// Test validateExcelAgainstSchema (should pass)
const val = validateExcelAgainstSchema(mockExcel, schema)
console.log('Validation (expected valid):', val)
assert(val.valid === true, 'Schema should validate against mockExcel')

// Test extractDataFromExcel
const extracted = extractDataFromExcel(mockExcel, schema)
console.log('Extracted data:', extracted.data)
// keys are taken from label cell values (or labelCell ref if empty)
assert(extracted.data['ACME'] === 123, 'Extract ACME -> 123')
assert(Array.isArray(extracted.warnings), 'Warnings is array')
// Expect at least one warning for the mapping that pointed to an empty cell
assert(extracted.warnings.length >= 1 && /No value at/.test(extracted.warnings[0]), 'Expect warning for empty value cell')

// Test validate failure case
const badSchema = { ...schema, fields: [...schema.fields, { id: 'bad', labelCellRef: 'Z1', valueCellRef: 'Z1' } as any] }
const val2 = validateExcelAgainstSchema(mockExcel, badSchema)
console.log('Validation (expected invalid):', val2)
assert(val2.valid === false && val2.errors.length >= 1, 'Bad schema should fail validation')

console.log('All tests passed')

// Note: run with a TypeScript runner (ts-node) or compile first.
