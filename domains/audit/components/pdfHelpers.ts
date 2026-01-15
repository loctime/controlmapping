import type { AuditFile } from "@/domains/audit"
import { normalizeDate } from "@/utils/date"
import {
  getCumplimientoPct,
  getHeaderNumber,
  getExecutiveSummaryForKPIs,
  getExecutiveSummaryForDistribution,
  getExecutiveSummaryForTrend,
  getExecutiveSummaryForAuditorias,
  getExecutiveSummaryForRanking,
} from "./dashboardHelpers"

export interface PdfReportData {
  kpis: {
    totalAuditorias: number
    totalItems: number
    cumplimientoPromedio: number
    totalIncumplimientos: number
  }
  distribucionCumplimiento: Array<{ name: string; value: number; color: string }>
  tendenciaMensual: Array<{ mes: string; cumplimiento: number; cantidad: number }>
  cumplimientoPorAuditoria: Array<{
    auditoria: string
    cumple: number
    cumple_parcial: number
    no_cumple: number
    no_aplica: number
  }>
  rankingOperaciones: Array<{ operacion: string; cumplimiento: number }>
  rankingInversoOperaciones: Array<{ operacion: string; cumplimiento: number }>
  alertasUmbral: {
    bajo70: number
    bajo50: number
    total: number
  }
  executiveSummaryKPIs: string
  executiveSummaryDistribution: string
  executiveSummaryTrend: string
  executiveSummaryAuditorias: string
  executiveSummaryRanking: string
  executiveSummaryRankingInverse: string
  nonComplianceSummary: {
    total: number
    noCumple: number
    cumpleParcial: number
  }
  observaciones: Array<{
    pregunta: string
    estado: "no_cumple" | "cumple_parcial"
    observacion: string
  }>
  periodoAnalizado: {
    fechaInicio?: Date
    fechaFin?: Date
  }
}

/**
 * Prepara todos los datos necesarios para generar el PDF del reporte
 */
export function preparePdfData(auditFiles: AuditFile[]): PdfReportData {
  if (auditFiles.length === 0) {
    return {
      kpis: {
        totalAuditorias: 0,
        totalItems: 0,
        cumplimientoPromedio: 0,
        totalIncumplimientos: 0,
      },
      distribucionCumplimiento: [],
      tendenciaMensual: [],
      cumplimientoPorAuditoria: [],
      rankingOperaciones: [],
      rankingInversoOperaciones: [],
      alertasUmbral: {
        bajo70: 0,
        bajo50: 0,
        total: 0,
      },
      executiveSummaryKPIs: "No hay auditorías procesadas para analizar.",
      executiveSummaryDistribution: "",
      executiveSummaryTrend: "",
      executiveSummaryAuditorias: "",
      executiveSummaryRanking: "",
      executiveSummaryRankingInverse: "",
      nonComplianceSummary: {
        total: 0,
        noCumple: 0,
        cumpleParcial: 0,
      },
      observaciones: [],
      periodoAnalizado: {},
    }
  }

  // Detectar disponibilidad de datos
  let hasBreakdowns = false
  let hasCumplimientoPct = false
  let hasFechas = false
  let hasOperaciones = false

  auditFiles.forEach((file) => {
    const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
    const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
    if (cumple !== null || noCumple !== null) {
      hasBreakdowns = true
    }
    if (getCumplimientoPct(file.headers) !== null) {
      hasCumplimientoPct = true
    }
    if (normalizeDate(file.headers.fecha)) {
      hasFechas = true
    }
    if (file.headers.operacion) {
      hasOperaciones = true
    }
  })

  // KPIs
  const totalAuditorias = auditFiles.length
  const totalItems = auditFiles.reduce((sum, file) => {
    const items = getHeaderNumber(file.headers, "cantidad_items")
    return sum + (items ?? 0)
  }, 0)

  const cumplimientos = auditFiles
    .map((file) => getCumplimientoPct(file.headers))
    .filter((val): val is number => val !== null && val > 0)

  const cumplimientoPromedio =
    cumplimientos.length > 0
      ? cumplimientos.reduce((sum, val) => sum + val, 0) / cumplimientos.length
      : 0

  const totalIncumplimientos = auditFiles.reduce((sum, file) => {
    const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
    return sum + (noCumple ?? 0)
  }, 0)

  // Distribución de cumplimiento
  const distribucion = {
    cumple: 0,
    cumple_parcial: 0,
    no_cumple: 0,
    no_aplica: 0,
  }

  auditFiles.forEach((file) => {
    const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
    const cumpleParcial = getHeaderNumber(file.headers, "cantidad_cumple_parcial")
    const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
    const noAplica = getHeaderNumber(file.headers, "cantidad_no_aplica")

    if (cumple !== null) distribucion.cumple += cumple
    if (cumpleParcial !== null) distribucion.cumple_parcial += cumpleParcial
    if (noCumple !== null) distribucion.no_cumple += noCumple
    if (noAplica !== null) distribucion.no_aplica += noAplica
  })

  const distribucionCumplimiento = [
    { name: "Cumple", value: distribucion.cumple, color: "#22c55e" },
    { name: "Cumple Parcial", value: distribucion.cumple_parcial, color: "#eab308" },
    { name: "No Cumple", value: distribucion.no_cumple, color: "#ef4444" },
    { name: "No Aplica", value: distribucion.no_aplica, color: "#6b7280" },
  ].filter((item) => item.value > 0)

  // Cumplimiento por Auditoría
  const cumplimientoPorAuditoria: Array<{
    auditoria: string
    cumple: number
    cumple_parcial: number
    no_cumple: number
    no_aplica: number
  }> = []

  auditFiles.forEach((file) => {
    const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
    const cumpleParcial = getHeaderNumber(file.headers, "cantidad_cumple_parcial")
    const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
    const noAplica = getHeaderNumber(file.headers, "cantidad_no_aplica")

    if (
      cumple !== null &&
      cumpleParcial !== null &&
      noCumple !== null &&
      noAplica !== null
    ) {
      const auditoriaLabel = file.headers.operacion
        ? String(file.headers.operacion).substring(0, 30)
        : file.fileName.length > 30
          ? `${file.fileName.substring(0, 27)}...`
          : file.fileName

      cumplimientoPorAuditoria.push({
        auditoria: auditoriaLabel,
        cumple: cumple,
        cumple_parcial: cumpleParcial,
        no_cumple: noCumple,
        no_aplica: noAplica,
      })
    }
  })

  // Tendencia mensual
  const mesesMap = new Map<string, { cumplimientos: number[]; count: number }>()

  auditFiles.forEach((file) => {
    const fecha = normalizeDate(file.headers.fecha)
    if (!fecha) return

    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
    const cumplimiento = getCumplimientoPct(file.headers)
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

  const tendenciaMensual = Array.from(mesesMap.entries())
    .map(([mes, data]) => {
      const promedio =
        data.cumplimientos.length > 0
          ? data.cumplimientos.reduce((sum, val) => sum + val, 0) / data.cumplimientos.length
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

  // Ranking de operaciones
  const operacionesMap = new Map<string, { cumplimiento: number; count: number }>()

  auditFiles.forEach((file) => {
    const operacion = file.headers.operacion
    if (!operacion) return

    const cumplimiento = getCumplimientoPct(file.headers)
    if (cumplimiento === null) return

    if (!operacionesMap.has(String(operacion))) {
      operacionesMap.set(String(operacion), { cumplimiento: 0, count: 0 })
    }

    const opData = operacionesMap.get(String(operacion))!
    opData.cumplimiento += cumplimiento
    opData.count++
  })

  const rankingOperaciones = Array.from(operacionesMap.entries())
    .map(([operacion, data]) => ({
      operacion: String(operacion).substring(0, 30),
      cumplimiento:
        data.count > 0 ? Math.round((data.cumplimiento / data.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.cumplimiento - a.cumplimiento)
    .slice(0, 10)

  const rankingInversoOperaciones = Array.from(operacionesMap.entries())
    .map(([operacion, data]) => ({
      operacion: String(operacion).substring(0, 30),
      cumplimiento:
        data.count > 0 ? Math.round((data.cumplimiento / data.count) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.cumplimiento - b.cumplimiento)
    .slice(0, 10)

  // Alertas por umbral
  let bajo70 = 0
  let bajo50 = 0

  auditFiles.forEach((file) => {
    const cumplimiento = getCumplimientoPct(file.headers)
    if (cumplimiento === null) return

    if (cumplimiento < 50) {
      bajo50++
    } else if (cumplimiento < 70) {
      bajo70++
    }
  })

  // Resumen de incumplimientos
  const allItems = auditFiles.flatMap((file) => file.items)
  const nonComplianceItems = allItems.filter(
    (item) => item.estado === "no_cumple" || item.estado === "cumple_parcial"
  )
  const noCumpleItems = nonComplianceItems.filter((item) => item.estado === "no_cumple")
  const cumpleParcialItems = nonComplianceItems.filter(
    (item) => item.estado === "cumple_parcial"
  )

  // Filtrar items con observaciones
  const itemsConObservaciones = nonComplianceItems
    .filter(
      (item) =>
        item.observaciones &&
        item.observaciones.trim().length > 0 &&
        (item.estado === "no_cumple" || item.estado === "cumple_parcial")
    )
    .map((item) => ({
      pregunta: item.pregunta,
      estado: item.estado as "no_cumple" | "cumple_parcial",
      observacion: item.observaciones || "",
    }))

  // Período analizado
  const fechas = auditFiles
    .map((file) => normalizeDate(file.headers.fecha))
    .filter((f): f is Date => f !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  const periodoAnalizado = {
    fechaInicio: fechas.length > 0 ? fechas[0] : undefined,
    fechaFin: fechas.length > 0 ? fechas[fechas.length - 1] : undefined,
  }

  // Generar textos ejecutivos
  const executiveSummaryKPIs = getExecutiveSummaryForKPIs(
    totalAuditorias,
    cumplimientoPromedio,
    totalIncumplimientos,
    hasCumplimientoPct,
    hasBreakdowns
  )

  const executiveSummaryDistribution = getExecutiveSummaryForDistribution(
    distribucionCumplimiento,
    hasBreakdowns
  )

  const executiveSummaryTrend = getExecutiveSummaryForTrend(
    tendenciaMensual,
    hasCumplimientoPct,
    hasFechas
  )

  const executiveSummaryAuditorias = getExecutiveSummaryForAuditorias(
    cumplimientoPorAuditoria,
    hasBreakdowns
  )

  const executiveSummaryRanking = getExecutiveSummaryForRanking(
    rankingOperaciones,
    false,
    hasCumplimientoPct,
    hasOperaciones
  )

  const executiveSummaryRankingInverse = getExecutiveSummaryForRanking(
    rankingInversoOperaciones,
    true,
    hasCumplimientoPct,
    hasOperaciones
  )

  return {
    kpis: {
      totalAuditorias,
      totalItems,
      cumplimientoPromedio: Math.round(cumplimientoPromedio * 100) / 100,
      totalIncumplimientos,
    },
    distribucionCumplimiento,
    tendenciaMensual,
    cumplimientoPorAuditoria,
    rankingOperaciones,
    rankingInversoOperaciones,
    alertasUmbral: {
      bajo70,
      bajo50,
      total: bajo70 + bajo50,
    },
    executiveSummaryKPIs,
    executiveSummaryDistribution,
    executiveSummaryTrend,
    executiveSummaryAuditorias,
    executiveSummaryRanking,
    executiveSummaryRankingInverse,
    nonComplianceSummary: {
      total: nonComplianceItems.length,
      noCumple: noCumpleItems.length,
      cumpleParcial: cumpleParcialItems.length,
    },
    observaciones: itemsConObservaciones,
    periodoAnalizado,
  }
}
