import { ExcelData, CellMapping } from './excel'

/**
 * A single field mapping in a persistent, UI-independent schema.
 * The schema stores both the cell that contains the label/name and the cell
 * that contains the value. No inference is performed when building the
 * schema from UI mappings.
 */
export interface ExcelFieldMapping {
  id: string
  /** reference to the cell that contains the human-readable field name (e.g. "B2") */
  labelCellRef: string
  /** reference to the cell that contains the value (e.g. "C2") */
  valueCellRef: string
  /** optional notes or sheet name if available */
  sheetName?: string
  notes?: string
}

/**
 * Top-level mapping schema that can be saved as JSON and later
 * applied to other Excel files with the same layout.
 */
export interface ExcelMappingSchema {
  schemaId: string
  schemaName?: string
  version?: string
  createdAt: string // ISO timestamp
  sourceFile?: string
  fields: ExcelFieldMapping[]
  metadata?: Record<string, any>
}

/**
 * Options for schema creation.
 */
export interface CreateSchemaOptions {
  schemaId?: string
  schemaName?: string
  version?: string
  sourceFile?: string
}

function inferValueType(v: any): ExcelFieldMapping['valueType'] {
  if (v === null || v === undefined || v === '') return 'empty'
  if (typeof v === 'number') return 'number'
  if (typeof v === 'boolean') return 'boolean'
  if (typeof v === 'string') {
    // crude date detection (ISO-ish)
    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:?\d{0,2}/
    if (iso.test(v)) return 'date'
    return 'string'
  }
  return 'unknown'
}

/**
 * Create an `ExcelMappingSchema` from an array of `CellMapping` (UI mappings)
 * and an `ExcelData` sample. The output is safe to JSON.stringify and save.
 *
 * - `mappings` is expected to reference `cellId` values that match keys in
 *   sheet.cells (e.g. "A1") or include an explicit sheet prefix like "Sheet1!A1".
 * - If a referenced cell cannot be found, the field will still be emitted with
 *   the provided `cellRef` and no sample/value metadata.
 */
export function createSchemaFromMappings(
  mappings: CellMapping[],
  _excelData: ExcelData,
  options: CreateSchemaOptions = {}
): ExcelMappingSchema {
  // Do NOT read cell contents or infer names here. Store the two references
  // exactly as provided by the UI so the same template can be applied to
  // other files.
  const fields = mappings.map((m) => {
    const field: ExcelFieldMapping = {
      id: m.id,
      labelCellRef: m.labelCell,
      valueCellRef: m.valueCell,
    }
    return field
  })

  const schema: ExcelMappingSchema = {
    schemaId: options.schemaId ?? `schema_${Date.now()}`,
    schemaName: options.schemaName,
    version: options.version ?? '1.0',
    createdAt: new Date().toISOString(),
    sourceFile: options.sourceFile,
    fields,
    metadata: {},
  }

  return schema
}

/**
 * Validate an `ExcelData` instance against an `ExcelMappingSchema`.
 * Only validates structure: that referenced `sheetName` exists and that
 * the `cellRef` exists within the referenced sheet's `cells`.
 */
export function validateExcelAgainstSchema(
  excelData: ExcelData,
  schema: ExcelMappingSchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const f of schema.fields) {
    // Ensure both referenced cells exist in the provided workbook.
    const valueExists = excelData.sheets.some((s) => s.cells && Object.prototype.hasOwnProperty.call(s.cells, f.valueCellRef))
    const labelExists = excelData.sheets.some((s) => s.cells && Object.prototype.hasOwnProperty.call(s.cells, f.labelCellRef))
    if (!valueExists) {
      errors.push(`Value cell '${f.valueCellRef}' for field id=${f.id} not found in workbook`)
    }
    if (!labelExists) {
      errors.push(`Label cell '${f.labelCellRef}' for field id=${f.id} not found in workbook`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export default createSchemaFromMappings

/**
 * Extract data from `excelData` using a previously-validated `schema`.
 * Assumes `validateExcelAgainstSchema` returned `valid: true`.
 * For each field the returned object will contain a key equal to
 * `field.fieldName` and the extracted `cell.value` (or `null`).
 * Missing / empty values produce warnings.
 */
export function extractDataFromExcel(
  excelData: ExcelData,
  schema: ExcelMappingSchema
): { data: Record<string, any>; warnings: string[] } {
  const data: Record<string, any> = {}
  const warnings: string[] = []

  for (const f of schema.fields) {
    // For extraction, read the label cell to determine the field name/key and
    // read the value cell for the value. If either is missing produce warnings.
    const labelCellRef = f.labelCellRef
    const valueCellRef = f.valueCellRef

    const labelSheet = excelData.sheets.find((s) => s.cells && Object.prototype.hasOwnProperty.call(s.cells, labelCellRef))
    const valueSheet = excelData.sheets.find((s) => s.cells && Object.prototype.hasOwnProperty.call(s.cells, valueCellRef))

    const labelVal = labelSheet?.cells?.[labelCellRef]?.value
    const valueVal = valueSheet?.cells?.[valueCellRef]?.value

    const key = labelVal !== null && labelVal !== undefined && String(labelVal).trim() !== '' ? String(labelVal) : labelCellRef

    if (valueVal === null || valueVal === undefined || valueVal === '') {
      warnings.push(`No value at ${valueSheet?.name ?? '<unknown>'}!${valueCellRef} for field '${key}'`)
      data[key] = valueVal ?? null
    } else {
      data[key] = valueVal
    }
  }

  return { data, warnings }
}
