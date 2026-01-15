import * as XLSX from "xlsx"
import type { ExcelData, SchemaTemplate, SchemaInstance, DataType } from "@/types/excel"
import type { AuditItem, AuditTotals, AuditFile } from "./types"

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Extrae la columna de una referencia de celda (e.g. "B2" -> "B")
 */
function extractColumn(cellRef: string): string {
  return cellRef.replace(/[0-9]/g, "")
}

/**
 * Convierte una referencia de columna a índice numérico (e.g. "A" -> 0, "B" -> 1, "AA" -> 26)
 * Usa XLSX.utils para mayor compatibilidad
 */
function columnToIndex(column: string): number {
  // Normalizar a mayúsculas
  const normalized = column.toUpperCase().trim()
  if (!normalized) return 0
  
  // Usar decode_cell con una celda ficticia para obtener el índice de columna
  try {
    const cell = XLSX.utils.decode_cell(`${normalized}1`)
    return cell.c
  } catch {
    // Fallback manual si XLSX falla
    let index = 0
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i)
      if (charCode >= 65 && charCode <= 90) {
        index = index * 26 + (charCode - 64)
      }
    }
    return index > 0 ? index - 1 : 0
  }
}

/**
 * Convierte un índice numérico a referencia de columna (e.g. 0 -> "A", 1 -> "B")
 * Usa XLSX.utils para mayor compatibilidad
 */
function indexToColumn(index: number): string {
  try {
    const cell = XLSX.utils.encode_cell({ r: 0, c: index })
    return cell.replace(/[0-9]/g, "")
  } catch {
    // Fallback manual si XLSX falla
    let column = ""
    index++
    while (index > 0) {
      const remainder = (index - 1) % 26
      column = String.fromCharCode(65 + remainder) + column
      index = Math.floor((index - 1) / 26)
    }
    return column
  }
}

/**
 * Obtiene el valor de una celda específica
 */
function getCellValue(excelData: ExcelData, cellRef: string): string | number | null {
  const sheet = excelData.sheets[0]
  if (!sheet || !sheet.cells) return null
  
  const cell = sheet.cells[cellRef]
  if (!cell) return null
  
  return cell.value ?? null
}

/**
 * Obtiene todos los valores de una columna completa
 * Retorna un array de valores, uno por cada fila
 */
function getColumnValues(excelData: ExcelData, columnRef: string): Array<string | number | null> {
  const sheet = excelData.sheets[0]
  if (!sheet || !sheet.cells) return []
  
  const values: Array<string | number | null> = []
  const columnIndex = columnToIndex(columnRef)
  
  // Iterar todas las filas posibles (0 a rows-1)
  for (let row = 0; row < sheet.rows; row++) {
    const cellRef = XLSX.utils.encode_cell({ r: row, c: columnIndex })
    const cell = sheet.cells[cellRef]
    values.push(cell?.value ?? null)
  }
  
  return values
}

/**
 * Convierte un valor según el tipo de dato especificado
 */
function convertValue(value: string | number | null, dataType?: DataType): string | number | Date | null {
  if (value === null || value === undefined) return null
  
  switch (dataType) {
    case "date":
      return convertToDate(value)
    
    case "number":
      return convertToNumber(value)
    
    case "percentage":
      return convertToPercentage(value)
    
    case "boolean":
      // Convertir boolean a número (1 o 0) para headers
      return convertToBoolean(value) ? 1 : 0
    
    case "string":
    default:
      return String(value)
  }
}

/**
 * Convierte un valor a Date
 * Acepta serial Excel (número) o string en formato ISO/date
 */
function convertToDate(value: string | number): Date | null {
  if (typeof value === "number") {
    // Serial de Excel (días desde 1900-01-01)
    // Excel tiene un bug: cuenta 1900 como año bisiesto, así que restamos 1 día
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + value * 86400000)
    return isNaN(date.getTime()) ? null : date
  }
  
  if (typeof value === "string") {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  
  return null
}

/**
 * Convierte un valor a número
 */
function convertToNumber(value: string | number): number | null {
  if (typeof value === "number") {
    return isNaN(value) || !isFinite(value) ? null : value
  }
  
  if (typeof value === "string") {
    // Remover separadores de miles y espacios
    const cleaned = value.replace(/,/g, "").replace(/\s/g, "").trim()
    const num = parseFloat(cleaned)
    return isNaN(num) || !isFinite(num) ? null : num
  }
  
  return null
}

/**
 * Convierte un valor a porcentaje (número entre 0 y 100)
 * Acepta: 0.78, 78, "78%", "0.78"
 */
function convertToPercentage(value: string | number): number | null {
  if (typeof value === "number") {
    // Si está entre 0 y 1, asumir que es decimal (0.78 -> 78)
    if (value >= 0 && value <= 1) {
      return value * 100
    }
    // Si está entre 1 y 100, asumir que ya está en porcentaje
    if (value >= 1 && value <= 100) {
      return value
    }
    return null
  }
  
  if (typeof value === "string") {
    const cleaned = value.replace(/%/g, "").replace(/,/g, "").replace(/\s/g, "").trim()
    const num = parseFloat(cleaned)
    if (isNaN(num) || !isFinite(num)) return null
    
    // Si el string original tenía %, asumir que ya está en porcentaje
    if (value.includes("%")) {
      return num
    }
    
    // Si no tenía %, verificar si es decimal o porcentaje
    if (num >= 0 && num <= 1) {
      return num * 100
    }
    if (num >= 1 && num <= 100) {
      return num
    }
    
    return null
  }
  
  return null
}

/**
 * Convierte un valor a boolean
 * Valores truthy: true, "true", "x", "✓", "si", "sí", "yes", "1"
 */
function convertToBoolean(value: string | number | boolean): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0 && !isNaN(value)
  
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    const truthyValues = ["true", "x", "✓", "si", "sí", "yes", "1", "verdadero"]
    return truthyValues.includes(normalized)
  }
  
  return false
}

/**
 * Determina el estado de un ítem basado en las columnas de estado
 * Prioridad: no_aplica > no_cumple > cumple_parcial > cumple
 * 
 * IMPORTANTE: Esta función solo se llama cuando hay al menos una marca.
 * El estado se deriva exclusivamente de la columna marcada según la prioridad.
 */
function determineItemState(
  cumple: boolean,
  cumple_parcial: boolean,
  no_cumple: boolean,
  no_aplica: boolean
): "cumple" | "cumple_parcial" | "no_cumple" | "no_aplica" {
  // Prioridad: no_aplica > no_cumple > cumple_parcial > cumple
  if (no_aplica) return "no_aplica"
  if (no_cumple) return "no_cumple"
  if (cumple_parcial) return "cumple_parcial"
  if (cumple) return "cumple"
  
  // Este caso no debería ocurrir si se valida antes de llamar a esta función
  // Pero por seguridad, retornar el estado más restrictivo
  return "no_cumple"
}

/**
 * Calcula los totales de los ítems
 */
function calculateTotals(items: AuditItem[]): AuditTotals {
  const totals: AuditTotals = {
    totalItems: items.length,
    cumple: 0,
    cumple_parcial: 0,
    no_cumple: 0,
    no_aplica: 0,
    porcentajeCumplimiento: 0,
  }
  
  items.forEach((item) => {
    totals[item.estado]++
  })
  
  // Calcular porcentaje de cumplimiento
  // Solo cuenta los que aplican (excluye no_aplica)
  const aplica = totals.totalItems - totals.no_aplica
  if (aplica > 0) {
    const cumpleTotal = totals.cumple + totals.cumple_parcial
    totals.porcentajeCumplimiento = (cumpleTotal / aplica) * 100
  }
  
  return totals
}

/**
 * Encuentra la fila de inicio de la tabla (primera fila con datos después de los headers)
 * Busca la primera fila que tenga contenido en la columna de "pregunta"
 */
function findTableStartRow(
  excelData: ExcelData,
  preguntaColumnRef: string
): number {
  const columnValues = getColumnValues(excelData, preguntaColumnRef)
  
  // Buscar la primera fila con contenido no vacío
  for (let i = 0; i < columnValues.length; i++) {
    const value = columnValues[i]
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return i
    }
  }
  
  // Si no se encuentra, empezar desde la fila 0
  return 0
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Parsea un Excel mapeado y lo convierte en un objeto AuditFile
 */
export function parseAudit(
  excelData: ExcelData,
  schemaTemplate: SchemaTemplate,
  schemaInstance: SchemaInstance
): AuditFile {
  const sheet = excelData.sheets[0]
  if (!sheet) {
    throw new Error("No se encontró ninguna hoja en el archivo Excel")
  }
  
  // ========================================================================
  // 1. PARSEAR HEADERS (campos del encabezado)
  // ========================================================================
  const headers: Record<string, string | number | Date | null> = {}
  
  // Inicializar campos de breakdown con null (asegurar que siempre estén presentes)
  const breakdownFields = [
    "cantidad_cumple",
    "cantidad_cumple_parcial", 
    "cantidad_no_cumple",
    "cantidad_no_aplica"
  ]
  
  breakdownFields.forEach((role) => {
    headers[role] = null
  })
  
  // Procesar todos los mapeos de headers
  schemaInstance.headerMappings.forEach((mapping) => {
    const field = schemaTemplate.headerFields.find((f) => f.role === mapping.role)
    if (!field) return
    
    const cellValue = getCellValue(excelData, mapping.cellOrColumn)
    const convertedValue = convertValue(cellValue, field.dataType)
    headers[mapping.role] = convertedValue
  })
  
  // ========================================================================
  // 2. PARSEAR ITEMS (filas de la tabla)
  // ========================================================================
  const items: AuditItem[] = []
  
  // Encontrar las columnas mapeadas
  const preguntaMapping = schemaInstance.tableMappings.find(
    (m) => m.role === "pregunta"
  )
  const cumpleMapping = schemaInstance.tableMappings.find(
    (m) => m.role === "cumple"
  )
  const cumpleParcialMapping = schemaInstance.tableMappings.find(
    (m) => m.role === "cumple_parcial"
  )
  const noCumpleMapping = schemaInstance.tableMappings.find(
    (m) => m.role === "no_cumple"
  )
  const noAplicaMapping = schemaInstance.tableMappings.find(
    (m) => m.role === "no_aplica"
  )
  const observacionesMapping = schemaInstance.tableMappings.find(
    (m) => m.role === "observaciones"
  )
  
  if (!preguntaMapping) {
    throw new Error("No se encontró el mapeo de la columna 'pregunta'")
  }
  
  // Extraer la columna de pregunta
  const preguntaColumnRef = extractColumn(preguntaMapping.cellOrColumn)
  
  // Encontrar la fila de inicio de la tabla
  const startRow = findTableStartRow(excelData, preguntaColumnRef)
  
  // Obtener valores de todas las columnas mapeadas
  const preguntaValues = getColumnValues(excelData, preguntaColumnRef)
  const cumpleValues = cumpleMapping
    ? getColumnValues(excelData, extractColumn(cumpleMapping.cellOrColumn))
    : []
  const cumpleParcialValues = cumpleParcialMapping
    ? getColumnValues(excelData, extractColumn(cumpleParcialMapping.cellOrColumn))
    : []
  const noCumpleValues = noCumpleMapping
    ? getColumnValues(excelData, extractColumn(noCumpleMapping.cellOrColumn))
    : []
  const noAplicaValues = noAplicaMapping
    ? getColumnValues(excelData, extractColumn(noAplicaMapping.cellOrColumn))
    : []
  const observacionesValues = observacionesMapping
    ? getColumnValues(excelData, extractColumn(observacionesMapping.cellOrColumn))
    : []
  
  // Procesar cada fila desde startRow hasta el final
  for (let row = startRow; row < preguntaValues.length; row++) {
    const pregunta = preguntaValues[row]
    
    // Si la pregunta está vacía, saltar esta fila
    if (pregunta === null || pregunta === undefined || String(pregunta).trim() === "") {
      continue
    }
    
    // Obtener valores de estado para esta fila
    const cumple = convertToBoolean(cumpleValues[row] ?? false)
    const cumpleParcial = convertToBoolean(cumpleParcialValues[row] ?? false)
    const noCumple = convertToBoolean(noCumpleValues[row] ?? false)
    const noAplica = convertToBoolean(noAplicaValues[row] ?? false)
    
    // REGLA OBLIGATORIA: Solo crear item si hay al menos una marca en alguna columna de estado
    const tieneMarca = cumple || cumpleParcial || noCumple || noAplica
    if (!tieneMarca) {
      // Ignorar filas donde todas las columnas de estado estén vacías
      continue
    }
    
    // Determinar el estado (solo se llama si hay al menos una marca)
    const estado = determineItemState(cumple, cumpleParcial, noCumple, noAplica)
    
    // Obtener observaciones
    const observaciones = observacionesValues[row]
      ? String(observacionesValues[row]).trim()
      : undefined
    
    items.push({
      pregunta: String(pregunta).trim(),
      estado,
      ...(observaciones && observaciones !== "" ? { observaciones } : {}),
    })
  }
  
  // ========================================================================
  // 3. CALCULAR TOTALES
  // ========================================================================
  // Priorizar valores desde headers (valores finales del Excel)
  // Solo calcular desde items si los headers no están disponibles
  let totals: AuditTotals
  
  const cantidadItems = headers["cantidad_items"]
  const cantidadCumple = headers["cantidad_cumple"]
  const cantidadCumpleParcial = headers["cantidad_cumple_parcial"]
  const cantidadNoCumple = headers["cantidad_no_cumple"]
  const cantidadNoAplica = headers["cantidad_no_aplica"]
  const porcentajeCumplimiento = headers["cumplimiento_total_pct"] ?? headers["porcentaje_cumplimiento"]
  
  // Calcular totales desde items como fallback
  const calculatedTotals = calculateTotals(items)
  
  // Si tenemos valores desde headers, usarlos (solo valores finales del Excel)
  if (
    typeof cantidadItems === "number" &&
    typeof cantidadCumple === "number" &&
    typeof cantidadCumpleParcial === "number" &&
    typeof cantidadNoCumple === "number" &&
    typeof cantidadNoAplica === "number"
  ) {
    // Usar valores completos desde headers
    totals = {
      totalItems: cantidadItems,
      cumple: cantidadCumple,
      cumple_parcial: cantidadCumpleParcial,
      no_cumple: cantidadNoCumple,
      no_aplica: cantidadNoAplica,
      porcentajeCumplimiento:
        typeof porcentajeCumplimiento === "number"
          ? porcentajeCumplimiento
          : calculatedTotals.porcentajeCumplimiento,
    }
  } else if (
    typeof cantidadItems === "number" &&
    typeof porcentajeCumplimiento === "number"
  ) {
    // Si solo tenemos cantidad_items y porcentaje, usar valores parciales del header con fallback a items
    totals = {
      totalItems: cantidadItems,
      cumple: typeof cantidadCumple === "number" ? cantidadCumple : calculatedTotals.cumple,
      cumple_parcial: typeof cantidadCumpleParcial === "number" ? cantidadCumpleParcial : calculatedTotals.cumple_parcial,
      no_cumple: typeof cantidadNoCumple === "number" ? cantidadNoCumple : calculatedTotals.no_cumple,
      no_aplica: typeof cantidadNoAplica === "number" ? cantidadNoAplica : calculatedTotals.no_aplica,
      porcentajeCumplimiento: porcentajeCumplimiento,
    }
  } else {
    // Si no hay headers disponibles, calcular desde items (fallback)
    totals = calculatedTotals
  }
  
  // ========================================================================
  // 4. CONSTRUIR RESULTADO FINAL
  // ========================================================================
  return {
    fileName: excelData.fileName,
    headers,
    items,
    totals,
  }
}
