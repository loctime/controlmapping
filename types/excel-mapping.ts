import { ExcelData, CellPosition, CellMapping } from './excel'

/**
 * A single field mapping in a persistent, UI-independent schema.
 * This object is JSON-serializable (no Date objects).
 */
export interface ExcelFieldMapping {
  id: string
  fieldName: string
  sheetName?: string
  cellRef: string // e.g. "A1"
  sampleValue?: string | number | null
  valueType?: 'string' | 'number' | 'boolean' | 'date' | 'empty' | 'unknown'
  position?: CellPosition
  isMerged?: boolean
  mergeRange?: string | null
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
  excelData: ExcelData,
  options: CreateSchemaOptions = {}
): ExcelMappingSchema {
  const fields = mappings.map((m) => {
    let raw = m.cellId
    let sheetName: string | undefined
    let cellRef = raw

    if (raw.includes('!')) {
      const parts = raw.split('!')
      sheetName = parts[0]
      cellRef = parts.slice(1).join('!')
    }

    // find sheet if not explicitly provided
    let sheet = undefined
    if (!sheetName) {
      sheet = excelData.sheets.find((s) => s.cells && Object.prototype.hasOwnProperty.call(s.cells, cellRef))
      sheetName = sheet?.name
    } else {
      sheet = excelData.sheets.find((s) => s.name === sheetName)
    }

    const cell = sheet?.cells?.[cellRef]
    const pos = sheet?.cellPositions?.[cellRef]
    const sampleValue = cell?.value ?? null
    const valueType = inferValueType(sampleValue)
    const isMerged = !!cell?.isMerged
    const mergeRange = cell?.mergeRange ?? null

    const field = {
      id: m.id,
      fieldName: m.label,
      sheetName,
      cellRef,
      sampleValue,
      valueType,
      position: pos,
      isMerged,
      mergeRange,
    } as ExcelFieldMapping

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
    const sheetName = f.sheetName
    if (!sheetName) {
      errors.push(`Field '${f.fieldName}' (id=${f.id}) has no sheetName`)
      continue
    }

    const sheet = excelData.sheets.find((s) => s.name === sheetName)
    if (!sheet) {
      errors.push(`Sheet '${sheetName}' referenced by field '${f.fieldName}' (id=${f.id}) not found`)
      continue
    }

    if (!sheet.cells || !Object.prototype.hasOwnProperty.call(sheet.cells, f.cellRef)) {
      errors.push(`Cell '${f.cellRef}' for field '${f.fieldName}' (id=${f.id}) not found in sheet '${sheetName}'`)
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
    const key = f.fieldName

    const sheet = f.sheetName ? excelData.sheets.find((s) => s.name === f.sheetName) : undefined
    if (!sheet) {
      warnings.push(`Sheet '${f.sheetName}' for field '${key}' not found`)
      data[key] = null
      continue
    }

    const cell = sheet.cells?.[f.cellRef]
    const val = cell?.value

    if (val === null || val === undefined || val === '') {
      warnings.push(`No value at ${f.sheetName}!${f.cellRef} for field '${key}'`)
      data[key] = val ?? null
    } else {
      data[key] = val
    }
  }

  return { data, warnings }
}
