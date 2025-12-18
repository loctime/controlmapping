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
  { id: 'm1', cellId: 'A1', label: 'Company', createdAt: new Date() },
  { id: 'm2', cellId: 'B1', label: 'Amount', createdAt: new Date() },
  { id: 'm3', cellId: 'C1', label: 'OptionalField', createdAt: new Date() },
]

// Test createSchemaFromMappings
const schema = createSchemaFromMappings(mappings, mockExcel, { schemaId: 's1', schemaName: 'TestSchema' })
console.log('Schema created:', schema.schemaId, 'fields:', schema.fields.length)
assert(schema.fields.length === 3, 'Expected 3 fields in schema')
assert(schema.fields.find((f) => f.fieldName === 'Company')?.sampleValue === 'ACME', 'Company sample value')
assert(schema.fields.find((f) => f.fieldName === 'Amount')?.valueType === 'number', 'Amount inferred type')

// Test validateExcelAgainstSchema (should pass)
const val = validateExcelAgainstSchema(mockExcel, schema)
console.log('Validation (expected valid):', val)
assert(val.valid === true, 'Schema should validate against mockExcel')

// Test extractDataFromExcel
const extracted = extractDataFromExcel(mockExcel, schema)
console.log('Extracted data:', extracted.data)
assert(extracted.data['Company'] === 'ACME', 'Extract Company value')
assert(extracted.data['Amount'] === 123, 'Extract Amount value')
assert(Array.isArray(extracted.warnings), 'Warnings is array')
assert(extracted.warnings.length === 1 && /No value at/.test(extracted.warnings[0]), 'Expect one warning for empty C1')

// Test validate failure case
const badSchema = { ...schema, fields: [...schema.fields, { id: 'bad', fieldName: 'Missing', sheetName: 'NoSheet', cellRef: 'Z1' } as any] }
const val2 = validateExcelAgainstSchema(mockExcel, badSchema)
console.log('Validation (expected invalid):', val2)
assert(val2.valid === false && val2.errors.length >= 1, 'Bad schema should fail validation')

console.log('All tests passed')

// Note: run with a TypeScript runner (ts-node) or compile first.
