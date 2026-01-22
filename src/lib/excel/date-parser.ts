/**
 * Helper unificado para parseo y normalización de fechas provenientes de Excel
 * 
 * Reglas:
 * - NO usa Date.parse ni new Date(string) para evitar dependencias del navegador
 * - Parseo manual con regex y reglas estrictas
 * - Formato de salida europeo: DD/MM o DD/MM/YYYY
 * - Soporta múltiples formatos de entrada con niveles de confianza
 */

export type DateParseResult = {
  value: string | null // DD/MM o DD/MM/YYYY normalizado
  isDate: boolean
  confidence: "high" | "medium" | "low"
  sourceFormat:
    | "excel-serial"
    | "numeric-slash"
    | "iso"
    | "text-month-es"
    | "ambiguous"
    | "unknown"
  original: unknown
}

/**
 * Meses en español (minúsculas para comparación)
 */
const MESES_ES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
}

/**
 * Convierte un número serial de Excel a Date
 * Excel cuenta días desde el 1 de enero de 1900
 * Excel tiene un bug: cuenta 1900 como año bisiesto (no lo es)
 * Por eso usamos 30 de diciembre de 1899 como epoch
 */
function excelSerialToDate(serial: number): { day: number; month: number; year: number } | null {
  if (typeof serial !== "number" || isNaN(serial) || !isFinite(serial) || serial < 1) {
    return null
  }

  // Excel epoch: 30 de diciembre de 1899
  const excelEpoch = new Date(1899, 11, 30)
  const date = new Date(excelEpoch.getTime() + serial * 86400000)
  
  if (isNaN(date.getTime())) {
    return null
  }

  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  }
}

/**
 * Valida que un día/mes/año sean válidos
 */
function isValidDate(day: number, month: number, year?: number): boolean {
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return false
  }

  if (year !== undefined) {
    if (year < 1900 || year > 2100) {
      return false
    }
    // Validar días según el mes y año (considerando años bisiestos)
    const daysInMonth = new Date(year, month, 0).getDate()
    return day <= daysInMonth
  }

  // Sin año, solo validar que el día sea razonable para el mes
  const daysInMonth = new Date(2000, month, 0).getDate() // Usar año 2000 como referencia
  return day <= daysInMonth
}

/**
 * Normaliza día/mes/año a formato DD/MM o DD/MM/YYYY
 */
function formatDate(day: number, month: number, year?: number): string {
  const dayStr = String(day).padStart(2, "0")
  const monthStr = String(month).padStart(2, "0")
  
  if (year !== undefined) {
    return `${dayStr}/${monthStr}/${year}`
  }
  
  return `${dayStr}/${monthStr}`
}

/**
 * Parsea formato DD/MM o DD/MM/YYYY
 */
function parseNumericSlash(input: string): { day: number; month: number; year?: number } | null {
  // Remover espacios y normalizar separadores
  const cleaned = input.trim().replace(/[-\s]/g, "/")
  
  // Patrón: DD/MM o DD/MM/YY o DD/MM/YYYY
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (!match) {
    return null
  }

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const yearPart = match[3]

  if (isNaN(day) || isNaN(month)) {
    return null
  }

  let year: number | undefined
  if (yearPart) {
    const yearNum = parseInt(yearPart, 10)
    if (isNaN(yearNum)) {
      return null
    }
    // Si el año es de 2 dígitos, asumir 20XX
    if (yearPart.length === 2) {
      year = 2000 + yearNum
    } else {
      year = yearNum
    }
  }

  return { day, month, year }
}

/**
 * Parsea formato ISO YYYY-MM-DD
 */
function parseISO(input: string): { day: number; month: number; year: number } | null {
  const match = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = parseInt(match[3], 10)

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null
  }

  return { day, month, year }
}

/**
 * Parsea formato de texto con mes en español
 * Ejemplos: "22 de noviembre", "22 noviembre", "22 nov", "22-NOV-24", "22 nov 2024"
 */
function parseTextMonthES(input: string): { day: number; month: number; year?: number } | null {
  const cleaned = input.trim().toLowerCase()
  
  // Patrón 1: "DD de MES" o "DD MES" o "DD-MES-YY" o "DD MES YYYY"
  // Buscar día al inicio
  const dayMatch = cleaned.match(/^(\d{1,2})/)
  if (!dayMatch) {
    return null
  }

  const day = parseInt(dayMatch[1], 10)
  if (isNaN(day) || day < 1 || day > 31) {
    return null
  }

  // Buscar mes en español
  let month: number | null = null
  for (const [mesName, mesNum] of Object.entries(MESES_ES)) {
    if (cleaned.includes(mesName)) {
      month = mesNum
      break
    }
  }

  if (!month) {
    return null
  }

  // Buscar año (opcional)
  // Puede estar en formato YY o YYYY
  const yearMatch = cleaned.match(/(?:^|\D)(\d{2,4})(?:\D|$)/)
  let year: number | undefined
  if (yearMatch) {
    const yearStr = yearMatch[1]
    const yearNum = parseInt(yearStr, 10)
    if (!isNaN(yearNum)) {
      if (yearStr.length === 2) {
        year = 2000 + yearNum
      } else {
        year = yearNum
      }
    }
  }

  return { day, month, year }
}

/**
 * Función principal: parsea una fecha desde Excel
 */
export function parseExcelDate(input: unknown): DateParseResult {
  // Caso base: null o undefined
  if (input === null || input === undefined) {
    return {
      value: null,
      isDate: false,
      confidence: "low",
      sourceFormat: "unknown",
      original: input,
    }
  }

  // ALTA CONFIANZA: Serial Excel (número)
  if (typeof input === "number") {
    const dateParts = excelSerialToDate(input)
    if (dateParts && isValidDate(dateParts.day, dateParts.month, dateParts.year)) {
      return {
        value: formatDate(dateParts.day, dateParts.month, dateParts.year),
        isDate: true,
        confidence: "high",
        sourceFormat: "excel-serial",
        original: input,
      }
    }
  }

  // Convertir a string para análisis
  const str = String(input).trim()
  if (!str) {
    return {
      value: null,
      isDate: false,
      confidence: "low",
      sourceFormat: "unknown",
      original: input,
    }
  }

  // ALTA CONFIANZA: Formato ISO YYYY-MM-DD
  const isoParts = parseISO(str)
  if (isoParts && isValidDate(isoParts.day, isoParts.month, isoParts.year)) {
    // Convertir a formato europeo DD/MM/YYYY
    return {
      value: formatDate(isoParts.day, isoParts.month, isoParts.year),
      isDate: true,
      confidence: "high",
      sourceFormat: "iso",
      original: input,
    }
  }

  // ALTA CONFIANZA: Formato numérico con slash DD/MM o DD/MM/YYYY
  const numericParts = parseNumericSlash(str)
  if (numericParts && isValidDate(numericParts.day, numericParts.month, numericParts.year)) {
    return {
      value: formatDate(numericParts.day, numericParts.month, numericParts.year),
      isDate: true,
      confidence: "high",
      sourceFormat: "numeric-slash",
      original: input,
    }
  }

  // MEDIA CONFIANZA: Texto con mes en español
  const textParts = parseTextMonthES(str)
  if (textParts && isValidDate(textParts.day, textParts.month, textParts.year)) {
    // Validar que tenga día obligatorio (ya validado en parseTextMonthES)
    return {
      value: formatDate(textParts.day, textParts.month, textParts.year),
      isDate: true,
      confidence: "medium",
      sourceFormat: "text-month-es",
      original: input,
    }
  }

  // BAJA CONFIANZA: Intentar parsear como número serial de Excel (string)
  const numValue = parseFloat(str.replace(",", "."))
  if (!isNaN(numValue) && isFinite(numValue) && numValue > 1 && numValue < 100000) {
    const dateParts = excelSerialToDate(numValue)
    if (dateParts && isValidDate(dateParts.day, dateParts.month, dateParts.year)) {
      return {
        value: formatDate(dateParts.day, dateParts.month, dateParts.year),
        isDate: true,
        confidence: "medium",
        sourceFormat: "excel-serial",
        original: input,
      }
    }
  }

  // BAJA CONFIANZA: Casos ambiguos que NO deben normalizarse automáticamente
  // - Solo mes: "noviembre", "nov"
  // - Formato MM/DD (americano): "11/22"
  // - Formato DD-MM sin contexto: "22-11"
  
  const lowerStr = str.toLowerCase()
  
  // Verificar si es solo un mes
  if (MESES_ES[lowerStr]) {
    return {
      value: null,
      isDate: false,
      confidence: "low",
      sourceFormat: "ambiguous",
      original: input,
    }
  }

  // Verificar formato MM/DD (americano) - NO normalizar
  const americanMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (americanMatch) {
    const first = parseInt(americanMatch[1], 10)
    const second = parseInt(americanMatch[2], 10)
    // Si el primer número es > 12, probablemente es DD/MM (europeo)
    // Si ambos son <= 12, es ambiguo
    if (first <= 12 && second <= 12 && first !== second) {
      return {
        value: null,
        isDate: false,
        confidence: "low",
        sourceFormat: "ambiguous",
        original: input,
      }
    }
  }

  // No se pudo determinar con confianza
  return {
    value: null,
    isDate: false,
    confidence: "low",
    sourceFormat: "unknown",
    original: input,
  }
}
