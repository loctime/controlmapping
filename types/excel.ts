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
