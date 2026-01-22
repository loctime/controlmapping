/**
 * CONTRATO CONGELADO - FUENTE UNICA DE VERDAD
 *
 * Este modulo es la fuente unica de verdad para normalizacion de fechas.
 * El contrato esta CONGELADO y cualquier violacion debe fallar en lint/compile-time.
 *
 * PROHIBICIONES ESTRICTAS:
 * - NO usar new Date directamente fuera de domains/date
 * - NO importar parseExcelDate directamente desde excel/date-parser
 * - NO parsear fechas manualmente
 * - NO normalizar fechas en UI, hooks ni pages
 *
 * OBLIGATORIO:
 * - Usar wrappers de dominio: normalizeDomainDate o normalizeAuditDate
 * - Importar parseExcelDate SOLO desde este modulo
 * - Toda excepcion requiere wrapper de dominio explicito
 *
 * EXCEPCIONES PERMITIDAS:
 * - domains/date puede usar new Date y parseExcelDate directamente
 * - src/lib/excel/date-parser.ts puede usar new Date (implementacion base)
 *
 * Este archivo:
 * - NO implementa logica
 * - NO contiene reglas de negocio
 * - SOLO reexporta normalizadores oficiales (Categoria A)
 */

export { excelNumberToDate } from "@/utils/date"
export { normalizeDate } from "@/utils/date"

export {
  parseExcelDate,
  type DateParseResult,
} from "@/src/lib/excel/date-parser"
