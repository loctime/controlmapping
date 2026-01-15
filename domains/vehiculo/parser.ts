import * as XLSX from "xlsx"
import type { ExcelData, SchemaTemplate, SchemaInstance, DataType } from "@/types/excel"
import type { VehiculoEvento, VehiculoEventosFile } from "./types"

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
 */
function columnToIndex(column: string): number {
  const normalized = column.toUpperCase().trim()
  if (!normalized) return 0
  
  try {
    const cell = XLSX.utils.decode_cell(`${normalized}1`)
    return cell.c
  } catch {
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
    const cleaned = value.replace(/,/g, "").replace(/\s/g, "").trim()
    const num = parseFloat(cleaned)
    return isNaN(num) || !isFinite(num) ? null : num
  }
  
  return null
}

/**
 * Encuentra la fila de inicio de la tabla (primera fila con datos)
 */
function findTableStartRow(excelData: ExcelData, columnRef: string): number {
  const values = getColumnValues(excelData, columnRef)
  
  // Buscar la primera fila con contenido no vacío
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return i
    }
  }
  
  return 0 // Si no se encuentra, empezar desde la fila 0
}

/**
 * Filtra eventos por tipo de evento
 */
export function filtrarEventosPorTipo(
  eventos: VehiculoEvento[],
  tipoEvento: string
): VehiculoEvento[] {
  return eventos.filter((evento) => evento.evento === tipoEvento)
}

/**
 * Obtiene la lista única de tipos de eventos
 */
export function obtenerTiposEvento(eventos: VehiculoEvento[]): string[] {
  const tipos = new Set<string>()
  eventos.forEach((evento) => {
    if (evento.evento && evento.evento.trim() !== "") {
      tipos.add(evento.evento.trim())
    }
  })
  return Array.from(tipos).sort()
}

// ============================================================================
// PARSER PRINCIPAL
// ============================================================================

/**
 * Parsea un archivo Excel de eventos vehiculares según el schema y mapeos proporcionados
 */
export function parseVehiculoEventos(
  excelData: ExcelData,
  schemaTemplate: SchemaTemplate,
  schemaInstance: SchemaInstance
): VehiculoEventosFile {
  const sheet = excelData.sheets[0]
  if (!sheet) {
    throw new Error("No se encontró ninguna hoja en el archivo Excel")
  }
  
  // ========================================================================
  // 1. ENCONTRAR MAPEOS DE COLUMNAS
  // ========================================================================
  const fechaMapping = schemaInstance.tableMappings.find((m) => m.role === "fecha")
  const latitudMapping = schemaInstance.tableMappings.find((m) => m.role === "latitud")
  const longitudMapping = schemaInstance.tableMappings.find((m) => m.role === "longitud")
  const vehiculoMapping = schemaInstance.tableMappings.find((m) => m.role === "vehiculo")
  const direccionMapping = schemaInstance.tableMappings.find((m) => m.role === "direccion")
  const velocidadMapping = schemaInstance.tableMappings.find((m) => m.role === "velocidad")
  const llaveMapping = schemaInstance.tableMappings.find((m) => m.role === "llave")
  const operadorMapping = schemaInstance.tableMappings.find((m) => m.role === "operador")
  const eventoMapping = schemaInstance.tableMappings.find((m) => m.role === "evento")
  const textoMapping = schemaInstance.tableMappings.find((m) => m.role === "texto")
  const descripcionMapping = schemaInstance.tableMappings.find((m) => m.role === "descripcion")
  const mapaMapping = schemaInstance.tableMappings.find((m) => m.role === "mapa")
  
  // Validar que al menos el campo "evento" esté mapeado (requerido para filtrado)
  if (!eventoMapping) {
    throw new Error("No se encontró el mapeo de la columna 'evento'")
  }
  
  // ========================================================================
  // 2. OBTENER VALORES DE TODAS LAS COLUMNAS MAPEADAS
  // ========================================================================
  const fechaValues = fechaMapping
    ? getColumnValues(excelData, extractColumn(fechaMapping.cellOrColumn))
    : []
  const latitudValues = latitudMapping
    ? getColumnValues(excelData, extractColumn(latitudMapping.cellOrColumn))
    : []
  const longitudValues = longitudMapping
    ? getColumnValues(excelData, extractColumn(longitudMapping.cellOrColumn))
    : []
  const vehiculoValues = vehiculoMapping
    ? getColumnValues(excelData, extractColumn(vehiculoMapping.cellOrColumn))
    : []
  const direccionValues = direccionMapping
    ? getColumnValues(excelData, extractColumn(direccionMapping.cellOrColumn))
    : []
  const velocidadValues = velocidadMapping
    ? getColumnValues(excelData, extractColumn(velocidadMapping.cellOrColumn))
    : []
  const llaveValues = llaveMapping
    ? getColumnValues(excelData, extractColumn(llaveMapping.cellOrColumn))
    : []
  const operadorValues = operadorMapping
    ? getColumnValues(excelData, extractColumn(operadorMapping.cellOrColumn))
    : []
  const eventoValues = getColumnValues(excelData, extractColumn(eventoMapping.cellOrColumn))
  const textoValues = textoMapping
    ? getColumnValues(excelData, extractColumn(textoMapping.cellOrColumn))
    : []
  const descripcionValues = descripcionMapping
    ? getColumnValues(excelData, extractColumn(descripcionMapping.cellOrColumn))
    : []
  const mapaValues = mapaMapping
    ? getColumnValues(excelData, extractColumn(mapaMapping.cellOrColumn))
    : []
  
  // ========================================================================
  // 3. ENCONTRAR FILA DE INICIO (saltar encabezados)
  // ========================================================================
  const eventoColumnRef = extractColumn(eventoMapping.cellOrColumn)
  const startRow = findTableStartRow(excelData, eventoColumnRef)
  
  // ========================================================================
  // 4. OBTENER DEFINICIONES DE CAMPOS DEL SCHEMA PARA CONVERSIÓN DE TIPOS
  // ========================================================================
  const fechaField = schemaTemplate.table.columns.find((f) => f.role === "fecha")
  const latitudField = schemaTemplate.table.columns.find((f) => f.role === "latitud")
  const longitudField = schemaTemplate.table.columns.find((f) => f.role === "longitud")
  const velocidadField = schemaTemplate.table.columns.find((f) => f.role === "velocidad")
  
  // ========================================================================
  // 5. PROCESAR CADA FILA Y CREAR EVENTOS
  // ========================================================================
  const eventos: VehiculoEvento[] = []
  
  for (let row = startRow; row < eventoValues.length; row++) {
    const evento = eventoValues[row]
    
    // Si el evento está vacío, saltar esta fila
    if (evento === null || evento === undefined || String(evento).trim() === "") {
      continue
    }
    
    // Extraer y convertir valores según sus tipos
    const fecha = fechaValues[row]
      ? (convertValue(fechaValues[row], fechaField?.dataType) as Date | null)
      : null
    
    const latitud = latitudValues[row]
      ? (convertValue(latitudValues[row], latitudField?.dataType) as number | null)
      : null
    
    const longitud = longitudValues[row]
      ? (convertValue(longitudValues[row], longitudField?.dataType) as number | null)
      : null
    
    const velocidad = velocidadValues[row]
      ? (convertValue(velocidadValues[row], velocidadField?.dataType) as number | null)
      : null
    
    // Validar campos requeridos
    if (fecha === null) {
      console.warn(`Fila ${row + 1}: Fecha inválida o vacía, omitiendo evento`)
      continue
    }
    
    if (latitud === null || longitud === null) {
      console.warn(`Fila ${row + 1}: Coordenadas inválidas, omitiendo evento`)
      continue
    }
    
    // Crear el evento
    eventos.push({
      fecha: fecha as Date,
      latitud: latitud as number,
      longitud: longitud as number,
      vehiculo: vehiculoValues[row] ? String(vehiculoValues[row]).trim() : "",
      direccion: direccionValues[row] ? String(direccionValues[row]).trim() : "",
      velocidad: velocidad !== null ? (velocidad as number) : 0,
      llave: llaveValues[row] ? String(llaveValues[row]).trim() : "",
      operador: operadorValues[row] ? String(operadorValues[row]).trim() : "",
      evento: String(evento).trim(),
      texto: textoValues[row] ? String(textoValues[row]).trim() : "",
      descripcion: descripcionValues[row] ? String(descripcionValues[row]).trim() : "",
      mapa: mapaValues[row] ? String(mapaValues[row]).trim() : "",
    })
  }
  
  // ========================================================================
  // 6. OBTENER TIPOS DE EVENTO ÚNICOS
  // ========================================================================
  const tiposEvento = obtenerTiposEvento(eventos)
  
  // ========================================================================
  // 7. CONSTRUIR RESULTADO FINAL
  // ========================================================================
  return {
    fileName: excelData.fileName,
    eventos,
    totalEventos: eventos.length,
    tiposEvento,
  }
}
