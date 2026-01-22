/**
 * CONTRATO DE NORMALIZACIÓN — ARCHIVO DE FRONTERA
 *
 * ⚠️ ESTE ARCHIVO NO IMPLEMENTA LÓGICA DE NORMALIZACIÓN
 *
 * Su función es:
 * - Declarar cuáles son los normalizadores base oficiales del sistema
 * - Centralizar exports (fuente única de verdad)
 * - Definir reglas arquitectónicas de uso por capa
 *
 * La lógica real vive en:
 * - utils/date.ts
 * - src/lib/excel/date-parser.ts
 *
 * =====================================================================
 * REGLAS ESTRICTAS
 * =====================================================================
 *
 * 1) NORMALIZADORES BASE (Categoría A)
 *    Solo las funciones exportadas aquí son oficiales para normalización
 *    de FECHAS. Toda normalización debe delegar en ellas directa o
 *    indirectamente.
 *
 * 2) CAPAS
 *    - Base (este módulo): declara normalizadores oficiales (sin lógica)
 *    - Dominio: wrappers con reglas de negocio (confianza, defaults, etc.)
 *    - UI / Hooks / Pages:
 *        ❌ PROHIBIDO normalizar datos persistentes
 *        ✅ PERMITIDO solo formateo visual
 *
 * 3) EXCLUSIONES ACTUALES
 *    Este contrato NO incluye normalización base de:
 *    - Números
 *    - Porcentajes
 *    - Patentes
 *
 *    (cuando existan normalizadores base para esos tipos,
 *     se agregarán aquí explícitamente)
 *
 * ESTABILIDAD: ALTA
 * Cambios requieren revisión arquitectónica.
 */

// =====================================================================
// NORMALIZADORES BASE OFICIALES — CATEGORÍA A
// =====================================================================

/**
 * Normalizador oficial: Serial Excel → Date
 *
 * IMPLEMENTACIÓN REAL:
 * utils/date.ts
 */
export { excelNumberToDate } from "../../../utils/date"

/**
 * Normalizador oficial: Fecha genérica → Date | null
 *
 * IMPLEMENTACIÓN REAL:
 * utils/date.ts
 */
export { normalizeDate } from "../../../utils/date"

/**
 * Normalizador oficial: Parseo robusto de fechas Excel / ISO / texto
 *
 * IMPLEMENTACIÓN REAL:
 * src/lib/excel/date-parser.ts
 */
export { parseExcelDate } from "../excel/date-parser"

/**
 * Tipo del resultado del parseo de fechas
 *
 * Exportado para que los dominios evalúen `confidence`
 * sin reimplementar lógica de parseo.
 */
export type { DateParseResult } from "../excel/date-parser"
