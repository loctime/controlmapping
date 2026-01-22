//domains/audit/normalizeAuditDate.ts
/**
 * Wrapper específico del dominio Auditoría
 *
 * Por ahora delega completamente al wrapper compartido.
 * Aquí vivirán futuras reglas semánticas del dominio.
 */

import { normalizeDomainDate } from "@/domains/date/normalizeDomainDate"

export function normalizeAuditDate(value: unknown): Date | null {
  return normalizeDomainDate(value)
}
