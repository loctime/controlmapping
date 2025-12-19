export interface ExcelData {
  fileName: string
  sheets: ExcelSheet[]
}

export interface ExcelSheet {
  name: string
  rows: number
  cols: number
  cells: Record<string, ExcelCell>
  merges?: string[] // Array of merge ranges like "A1:B2"
  html?: string // HTML fiel renderizado
  cellPositions?: Record<string, CellPosition> // Posiciones y dimensiones de celdas
}

export interface CellPosition {
  row: number
  col: number
  rowSpan: number
  colSpan: number
  width: number
  height: number
  x: number
  y: number
}

export interface ExcelCell {
  value: string | number
  style?: CellStyle
  isMerged?: boolean
  mergeRange?: string
}

export interface CellStyle {
  // Fuente
  fontFamily?: string
  fontSize?: number
  fontWeight?: string | number
  fontStyle?: string
  color?: string
  underline?: boolean
  
  // Fondo
  backgroundColor?: string
  fillPattern?: string
  
  // Bordes
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  borderColor?: string
  
  // Alineación
  textAlign?: "left" | "center" | "right" | "justify"
  verticalAlign?: "top" | "middle" | "bottom"
  
  // Formato de número
  numFmt?: string
  
  // Otros
  wrapText?: boolean
  textRotation?: number
}

export interface CellMapping {
  id: string
  /** Cell reference that contains the field name (e.g. B2 -> "Nombre") */
  labelCell: string
  /** Cell reference that contains the value (e.g. C2 -> "Fernando") */
  valueCell: string
  /** Optional manual override for the label. If provided, this is used instead of the labelCell value */
  labelOverride?: string
  createdAt: Date
}

// Schema Template Types
export type DataType = "string" | "number" | "date" | "boolean" | "percentage"

export interface SchemaField {
  role: string
  label: string
  required: boolean
  description?: string
  dataType?: DataType
}

export interface SchemaTable {
  description?: string
  columns: SchemaField[]
}

export interface SchemaTemplate {
  schemaId: string
  name: string
  description?: string
  version: number
  type: string
  headerFields: SchemaField[]
  table: SchemaTable
}

// Schema Instance - mapeo de un template a un Excel específico
export interface SchemaFieldMapping {
  role: string
  /** Para headerFields: referencia de celda (e.g. "B2") */
  /** Para table.columns: referencia de columna (e.g. "C") */
  cellOrColumn: string
  isColumn: boolean // true si es columna, false si es celda
}

export interface SchemaInstance {
  schemaId: string
  schemaVersion: number
  fileName: string
  headerMappings: SchemaFieldMapping[] // Mapeos de headerFields
  tableMappings: SchemaFieldMapping[] // Mapeos de table.columns
  createdAt: Date
}
