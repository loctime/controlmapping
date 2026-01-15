import { useMemo } from "react"
import type { AuditFile } from "@/domains/audit"
import { normalizeDate } from "@/utils/date"

/**
 * Filtros opcionales para métricas
 */
export interface MetricFilters {
  operationId?: string
  operatorId?: string
}

/**
 * Helper para obtener el porcentaje de cumplimiento desde headers
 */
function getCumplimientoPct(headers: AuditFile["headers"]): number | null {
  const value =
    headers.cumplimiento_total_pct ?? headers.porcentaje_cumplimiento ?? null

  if (value === null || value === undefined) return null

  if (typeof value === "number") return value
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/%/g, "").replace(/,/g, ".").trim())
    return isNaN(num) ? null : num
  }

  return null
}

/**
 * Helper para obtener un valor numérico desde headers
 */
function getHeaderNumber(
  headers: AuditFile["headers"],
  key: string
): number | null {
  const value = headers[key]
  if (value === null || value === undefined) return null

  if (typeof value === "number") return value
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/,/g, ".").trim())
    return isNaN(num) ? null : num
  }

  return null
}

/**
 * Filtra auditorías según los filtros proporcionados
 */
function filterAudits(
  audits: AuditFile[],
  filters?: MetricFilters
): AuditFile[] {
  if (!filters) return audits

  return audits.filter((audit) => {
    if (filters.operationId) {
      const operacion = String(audit.headers.operacion || "").trim()
      if (operacion !== filters.operationId) return false
    }

    if (filters.operatorId) {
      const operario =
        String(
          audit.headers.operario ||
            audit.headers.auditor ||
            audit.headers.responsable ||
            ""
        ).trim() || null
      if (!operario || operario !== filters.operatorId) return false
    }

    return true
  })
}

/**
 * Calcula el porcentaje de cumplimiento promedio
 */
export function calculateCompliance(
  audits: AuditFile[],
  filters?: MetricFilters
): number {
  const filtered = filterAudits(audits, filters)

  const cumplimientos = filtered
    .map((audit) => getCumplimientoPct(audit.headers))
    .filter((val): val is number => val !== null && val > 0)

  if (cumplimientos.length === 0) return 0

  const promedio =
    cumplimientos.reduce((sum, val) => sum + val, 0) / cumplimientos.length

  return Math.round(promedio * 100) / 100
}

/**
 * Agrupa auditorías por mes y calcula cumplimiento promedio
 */
export function groupByMonth(
  audits: AuditFile[],
  filters?: MetricFilters
): Array<{ mes: string; cumplimiento: number; cantidad: number }> {
  const filtered = filterAudits(audits, filters)
  const mesesMap = new Map<string, { cumplimientos: number[]; count: number }>()

  filtered.forEach((audit) => {
    const fecha = normalizeDate(audit.headers.fecha)
    if (!fecha) return

    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
    const cumplimiento = getCumplimientoPct(audit.headers)
    if (cumplimiento === null) return

    if (!mesesMap.has(mesKey)) {
      mesesMap.set(mesKey, { cumplimientos: [], count: 0 })
    }

    const mesData = mesesMap.get(mesKey)!
    mesData.cumplimientos.push(cumplimiento)
    mesData.count++
  })

  const monthNames = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ]

  const tendencia = Array.from(mesesMap.entries())
    .map(([mes, data]) => {
      const promedio =
        data.cumplimientos.length > 0
          ? data.cumplimientos.reduce((sum, val) => sum + val, 0) /
            data.cumplimientos.length
          : 0

      const [year, month] = mes.split("-")
      const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`

      return {
        mes: monthLabel,
        cumplimiento: Math.round(promedio * 100) / 100,
        cantidad: data.count,
      }
    })
    .sort((a, b) => {
      const [mesA, yearA] = a.mes.split(" ")
      const [mesB, yearB] = b.mes.split(" ")
      const monthIndexA = monthNames.indexOf(mesA)
      const monthIndexB = monthNames.indexOf(mesB)
      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB)
      return monthIndexA - monthIndexB
    })

  return tendencia
}

/**
 * Agrupa auditorías por operación y calcula métricas
 */
export function groupByOperation(
  audits: AuditFile[],
  filters?: MetricFilters
): Array<{
  operacion: string
  cumplimiento: number
  cantidad: number
  totalItems: number
  incumplimientos: number
}> {
  const filtered = filterAudits(audits, filters)
  const operacionesMap = new Map<
    string,
    {
      cumplimientos: number[]
      count: number
      totalItems: number
      incumplimientos: number
    }
  >()

  filtered.forEach((audit) => {
    const operacion = audit.headers.operacion
    if (!operacion) return

    const cumplimiento = getCumplimientoPct(audit.headers)
    if (cumplimiento === null) return

    const operacionKey = String(operacion).trim()
    if (!operacionesMap.has(operacionKey)) {
      operacionesMap.set(operacionKey, {
        cumplimientos: [],
        count: 0,
        totalItems: 0,
        incumplimientos: 0,
      })
    }

    const opData = operacionesMap.get(operacionKey)!
    opData.cumplimientos.push(cumplimiento)
    opData.count++
    opData.totalItems += audit.totals.totalItems
    opData.incumplimientos += audit.totals.no_cumple
  })

  return Array.from(operacionesMap.entries())
    .map(([operacion, data]) => ({
      operacion: operacion.substring(0, 50),
      cumplimiento:
        data.cumplimientos.length > 0
          ? Math.round(
              (data.cumplimientos.reduce((sum, val) => sum + val, 0) /
                data.cumplimientos.length) *
                100
            ) / 100
          : 0,
      cantidad: data.count,
      totalItems: data.totalItems,
      incumplimientos: data.incumplimientos,
    }))
    .sort((a, b) => b.cumplimiento - a.cumplimiento)
}

/**
 * Agrupa auditorías por operario y calcula métricas
 */
export function groupByOperator(
  audits: AuditFile[],
  filters?: MetricFilters
): Array<{
  operario: string
  cumplimiento: number
  cantidad: number
  totalItems: number
  incumplimientos: number
}> {
  const filtered = filterAudits(audits, filters)
  const operariosMap = new Map<
    string,
    {
      cumplimientos: number[]
      count: number
      totalItems: number
      incumplimientos: number
    }
  >()

  filtered.forEach((audit) => {
    // Buscar campo de operario en diferentes posibles campos
    const operario =
      audit.headers.operario ||
      audit.headers.auditor ||
      audit.headers.responsable ||
      null

    if (!operario) return

    const cumplimiento = getCumplimientoPct(audit.headers)
    if (cumplimiento === null) return

    const operarioKey = String(operario).trim()
    if (!operariosMap.has(operarioKey)) {
      operariosMap.set(operarioKey, {
        cumplimientos: [],
        count: 0,
        totalItems: 0,
        incumplimientos: 0,
      })
    }

    const opData = operariosMap.get(operarioKey)!
    opData.cumplimientos.push(cumplimiento)
    opData.count++
    opData.totalItems += audit.totals.totalItems
    opData.incumplimientos += audit.totals.no_cumple
  })

  return Array.from(operariosMap.entries())
    .map(([operario, data]) => ({
      operario: operario.substring(0, 50),
      cumplimiento:
        data.cumplimientos.length > 0
          ? Math.round(
              (data.cumplimientos.reduce((sum, val) => sum + val, 0) /
                data.cumplimientos.length) *
                100
            ) / 100
          : 0,
      cantidad: data.count,
      totalItems: data.totalItems,
      incumplimientos: data.incumplimientos,
    }))
    .sort((a, b) => b.cumplimiento - a.cumplimiento)
}

/**
 * Calcula la distribución de estados de cumplimiento
 */
export function calculateDistribution(
  audits: AuditFile[],
  filters?: MetricFilters
): Array<{ name: string; value: number; color: string }> {
  const filtered = filterAudits(audits, filters)

  const distribucion = {
    cumple: 0,
    cumple_parcial: 0,
    no_cumple: 0,
    no_aplica: 0,
  }

  filtered.forEach((audit) => {
    distribucion.cumple += audit.totals.cumple
    distribucion.cumple_parcial += audit.totals.cumple_parcial
    distribucion.no_cumple += audit.totals.no_cumple
    distribucion.no_aplica += audit.totals.no_aplica
  })

  return [
    { name: "Cumple", value: distribucion.cumple, color: "#22c55e" },
    {
      name: "Cumple Parcial",
      value: distribucion.cumple_parcial,
      color: "#eab308",
    },
    { name: "No Cumple", value: distribucion.no_cumple, color: "#ef4444" },
    { name: "No Aplica", value: distribucion.no_aplica, color: "#6b7280" },
  ].filter((item) => item.value > 0)
}

/**
 * Hook para calcular métricas del dashboard
 */
export function useAuditMetrics(
  audits: AuditFile[],
  filters?: MetricFilters
) {
  const filteredAudits = useMemo(
    () => filterAudits(audits, filters),
    [audits, filters]
  )

  const compliance = useMemo(
    () => calculateCompliance(audits, filters),
    [audits, filters]
  )

  const monthlyTrend = useMemo(
    () => groupByMonth(audits, filters),
    [audits, filters]
  )

  const distribution = useMemo(
    () => calculateDistribution(audits, filters),
    [audits, filters]
  )

  const operations = useMemo(
    () => groupByOperation(audits, filters),
    [audits, filters]
  )

  const operators = useMemo(
    () => groupByOperator(audits, filters),
    [audits, filters]
  )

  // KPIs generales
  const kpis = useMemo(() => {
    const totalAuditorias = filteredAudits.length
    const totalItems = filteredAudits.reduce(
      (sum, audit) => sum + audit.totals.totalItems,
      0
    )
    const totalIncumplimientos = filteredAudits.reduce(
      (sum, audit) => sum + audit.totals.no_cumple,
      0
    )

    return {
      totalAuditorias,
      totalItems,
      cumplimientoPromedio: compliance,
      totalIncumplimientos,
    }
  }, [filteredAudits, compliance])

  // Última auditoría
  const ultimaAuditoria = useMemo(() => {
    const conFechas = filteredAudits
      .map((audit) => ({
        audit,
        fecha: normalizeDate(audit.headers.fecha),
      }))
      .filter((item): item is { audit: AuditFile; fecha: Date } => item.fecha !== null)
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())

    return conFechas.length > 0 ? conFechas[0].audit : null
  }, [filteredAudits])

  return {
    filteredAudits,
    compliance,
    monthlyTrend,
    distribution,
    operations,
    operators,
    kpis,
    ultimaAuditoria,
  }
}
