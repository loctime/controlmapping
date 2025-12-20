/**
 * Utilidades canónicas para manejo de fechas
 * Soporta conversión desde números de Excel, strings y objetos Date
 */

/**
 * Convierte un número serial de Excel a Date
 * Excel cuenta días desde el 1 de enero de 1900
 * Excel tiene un bug: cuenta 1900 como año bisiesto (no lo es)
 * Por eso usamos 30 de diciembre de 1899 como epoch
 */
export function excelNumberToDate(excelSerial: number): Date | null {
  if (typeof excelSerial !== "number" || isNaN(excelSerial) || !isFinite(excelSerial)) {
    return null
  }

  // Excel epoch: 30 de diciembre de 1899
  const excelEpoch = new Date(1899, 11, 30)
  const date = new Date(excelEpoch.getTime() + excelSerial * 86400000)
  
  return isNaN(date.getTime()) ? null : date
}

/**
 * Normaliza cualquier valor de fecha a Date | null
 * Acepta: número (serial Excel), string (ISO/date), Date
 */
export function normalizeDate(
  value: string | number | Date | null | undefined
): Date | null {
  if (value === null || value === undefined) {
    return null
  }

  // Si ya es Date, validar y retornar
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }

  // Si es número, asumir serial de Excel
  if (typeof value === "number") {
    return excelNumberToDate(value)
  }

  // Si es string, intentar parsear
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null

    // Intentar parsear como número primero (puede ser serial Excel como string)
    const numValue = parseFloat(trimmed.replace(",", "."))
    if (!isNaN(numValue) && isFinite(numValue)) {
      // Si parece un serial de Excel (típicamente > 1 y < 100000)
      if (numValue > 1 && numValue < 100000) {
        const excelDate = excelNumberToDate(numValue)
        if (excelDate) return excelDate
      }
    }

    // Intentar parsear como fecha ISO o formato estándar
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return null
}

/**
 * Formatea una fecha a DD/MM/AA
 * Si la fecha es null, retorna string vacío
 */
export function formatDateDDMMAA(date: Date | null): string {
  if (!date) return ""

  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).slice(-2)

  return `${day}/${month}/${year}`
}

/**
 * Formatea una fecha a DD/MM/AAAA (año completo)
 */
export function formatDateDDMMAAAA(date: Date | null): string {
  if (!date) return ""

  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear())

  return `${day}/${month}/${year}`
}

/**
 * Obtiene el inicio del mes para una fecha dada
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/**
 * Obtiene el fin del mes para una fecha dada
 */
export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

/**
 * Compara dos fechas ignorando la hora (solo día/mes/año)
 * Retorna: -1 si date1 < date2, 0 si iguales, 1 si date1 > date2
 */
export function compareDates(date1: Date | null, date2: Date | null): number {
  if (!date1 && !date2) return 0
  if (!date1) return -1
  if (!date2) return 1

  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())

  if (d1 < d2) return -1
  if (d1 > d2) return 1
  return 0
}

/**
 * Verifica si dos fechas son el mismo día
 */
export function isSameDay(date1: Date | null, date2: Date | null): boolean {
  return compareDates(date1, date2) === 0
}

