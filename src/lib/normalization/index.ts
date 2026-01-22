/**
 * ⚠️ CONTRATO CONGELADO — FUENTE ÚNICA DE VERDAD
 *
 * Este módulo es la fuente única de verdad para normalización de fechas.
 * El contrato está CONGELADO y cualquier violación debe fallar en lint/compile-time.
 *
 * PROHIBICIONES ESTRICTAS:
 * - ❌ NO usar 'new Date(...)' directamente fuera de domains/date/**/*.ts
 * - ❌ NO importar parseExcelDate directamente desde excel/date-parser
 * - ❌ NO parsear fechas manualmente (DD/MM, split, parseInt, etc.)
 * - ❌ NO normalizar fechas en UI, hooks ni pages
 *
 * OBLIGATORIO:
 * - ✅ Usar wrappers de dominio: normalizeDomainDate() o normalizeAuditDate()
 * - ✅ Importar parseExcelDate SOLO desde este módulo (@/lib/normalization)
 * - ✅ Toda excepción requiere wrapper de dominio explícito
 *
 * EXCEPCIONES PERMITIDAS:
 * - domains/date/**/*.ts puede usar new Date() y parseExcelDate directamente
 * - src/lib/excel/date-parser.ts puede usar new Date() (implementación base)
 *
 * Este archivo:
 * - NO implementa lógica
 * - NO contiene reglas de negocio
 * - SOLO reexporta normalizadores oficiales (Categoría A)
 */

export { excelNumberToDate } from "@/utils/date"
export { normalizeDate } from "@/utils/date"

export {
  parseExcelDate,
  type DateParseResult,
} from "../../lib/excel/date-parser"
