//domains/date/normalizeDomainDate.ts
/**
 * Wrapper de dominio compartido para normalización de fechas
 */

import { parseExcelDate } from "@/src/lib/normalization"

export function normalizeDomainDate(value: unknown): Date | null {
  const result = parseExcelDate(value)

  if (!result.isDate || result.confidence === "low") {
    return null
  }

  if (!result.value) {
    return null
  }

  const match = result.value.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?$/)
  if (!match) {
    return null
  }

  const day = Number(match[1])
  const month = Number(match[2]) - 1
  const year = match[3]
    ? Number(match[3])
    : new Date().getFullYear()

  const date = new Date(year, month, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}
