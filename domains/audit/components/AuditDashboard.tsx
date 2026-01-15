"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, FileCheck, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import type { AuditFile } from "@/domains/audit"
import { normalizeDate } from "@/utils/date"
import { NonComplianceList } from "./NonComplianceList"

interface AuditDashboardProps {
  auditFiles: AuditFile[]
}

/**
 * Helpers para obtener métricas oficiales desde headers
 * REGLA: Solo usar valores desde audit.headers (mapeados desde Excel)
 */

/**
 * Obtiene el porcentaje de cumplimiento oficial desde headers
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
 * Obtiene un valor numérico desde headers
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
 * Helpers para generar texto ejecutivo
 * REGLA: Solo usar datos desde headers, sin inferencias
 */

/**
 * Genera texto ejecutivo para KPIs generales
 */
function getExecutiveSummaryForKPIs(
  totalAuditorias: number,
  cumplimientoPromedio: number,
  totalIncumplimientos: number,
  hasCumplimientoPct: boolean,
  hasBreakdowns: boolean
): string {
  if (totalAuditorias === 0) {
    return "No hay auditorías procesadas para analizar."
  }

  const partes: string[] = []

  // Volumen de auditorías
  partes.push(`Se analizaron ${totalAuditorias} auditoría${totalAuditorias > 1 ? "s" : ""}`)

  // Cumplimiento promedio
  if (hasCumplimientoPct && cumplimientoPromedio > 0) {
    let interpretacionCumplimiento = ""
    if (cumplimientoPromedio >= 90) {
      interpretacionCumplimiento = "con un nivel de cumplimiento excelente"
    } else if (cumplimientoPromedio >= 80) {
      interpretacionCumplimiento = "con un nivel de cumplimiento satisfactorio"
    } else if (cumplimientoPromedio >= 70) {
      interpretacionCumplimiento = "con un nivel de cumplimiento aceptable"
    } else if (cumplimientoPromedio >= 50) {
      interpretacionCumplimiento = "con un nivel de cumplimiento que requiere atención"
    } else {
      interpretacionCumplimiento = "con un nivel de cumplimiento crítico que requiere acción inmediata"
    }
    partes.push(`${interpretacionCumplimiento} (promedio del ${cumplimientoPromedio.toFixed(1)}%)`)
  } else {
    partes.push("sin información de cumplimiento disponible en los datos")
  }

  // Incumplimientos
  if (hasBreakdowns) {
    if (totalIncumplimientos > 0) {
      partes.push(`identificándose ${totalIncumplimientos} incumplimiento${totalIncumplimientos > 1 ? "s" : ""} que requieren seguimiento`)
    } else {
      partes.push("sin incumplimientos registrados")
    }
  }

  return partes.join(", ") + "."
}

/**
 * Genera texto ejecutivo para distribución de cumplimiento
 */
function getExecutiveSummaryForDistribution(
  distribucion: Array<{ name: string; value: number }>,
  hasBreakdowns: boolean
): string {
  if (!hasBreakdowns || distribucion.length === 0) {
    return "No se puede evaluar la composición de cumplimiento debido a la ausencia de datos de breakdown en los headers. Se requiere mapear los campos de cantidad (cumple, cumple parcial, no cumple, no aplica) para realizar este análisis."
  }

  const total = distribucion.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) {
    return "No hay datos de distribución disponibles para interpretar."
  }

  const cumple = distribucion.find((d) => d.name === "Cumple")?.value ?? 0
  const cumpleParcial = distribucion.find((d) => d.name === "Cumple Parcial")?.value ?? 0
  const noCumple = distribucion.find((d) => d.name === "No Cumple")?.value ?? 0
  const noAplica = distribucion.find((d) => d.name === "No Aplica")?.value ?? 0

  const pctCumple = (cumple / total) * 100
  const pctNoCumple = (noCumple / total) * 100
  const pctCumpleParcial = (cumpleParcial / total) * 100

  const partes: string[] = []

  // Predominancia
  if (pctCumple >= 60) {
    partes.push(`Predomina el cumplimiento total (${pctCumple.toFixed(0)}% de los ítems)`)
  } else if (pctCumple + pctCumpleParcial >= 60) {
    partes.push(`El cumplimiento total y parcial representan el ${(pctCumple + pctCumpleParcial).toFixed(0)}% de los ítems`)
  } else {
    partes.push(`El cumplimiento total representa el ${pctCumple.toFixed(0)}% de los ítems`)
  }

  // Peso de no cumple
  if (pctNoCumple > 20) {
    partes.push(`con una presencia significativa de incumplimientos (${pctNoCumple.toFixed(0)}%) que requiere atención prioritaria`)
  } else if (pctNoCumple > 10) {
    partes.push(`con incumplimientos moderados (${pctNoCumple.toFixed(0)}%) que deben monitorearse`)
  } else if (pctNoCumple > 0) {
    partes.push(`con incumplimientos menores (${pctNoCumple.toFixed(0)}%)`)
  }

  return partes.join(", ") + "."
}

/**
 * Genera texto ejecutivo para tendencia mensual
 */
function getExecutiveSummaryForTrend(
  tendencia: Array<{ mes: string; cumplimiento: number; cantidad: number }>,
  hasCumplimientoPct: boolean,
  hasFechas: boolean
): string {
  if (!hasCumplimientoPct || !hasFechas) {
    return "No se puede analizar la tendencia temporal debido a la ausencia de fechas o porcentajes de cumplimiento en los headers."
  }

  if (tendencia.length === 0) {
    return "No hay datos de tendencia disponibles para interpretar."
  }

  if (tendencia.length === 1) {
    return `Solo se cuenta con datos de un mes (${tendencia[0].mes}), con un cumplimiento del ${tendencia[0].cumplimiento.toFixed(1)}%. Se requiere información de múltiples períodos para evaluar tendencias.`
  }

  const primerValor = tendencia[0].cumplimiento
  const ultimoValor = tendencia[tendencia.length - 1].cumplimiento
  const diferencia = ultimoValor - primerValor
  const promedio = tendencia.reduce((sum, t) => sum + t.cumplimiento, 0) / tendencia.length

  const partes: string[] = []

  // Tendencia general
  if (Math.abs(diferencia) < 2) {
    partes.push(`El cumplimiento se mantiene estable en torno al ${promedio.toFixed(1)}%`)
  } else if (diferencia > 5) {
    partes.push(`Se observa una mejora significativa del cumplimiento (de ${primerValor.toFixed(1)}% a ${ultimoValor.toFixed(1)}%)`)
  } else if (diferencia > 2) {
    partes.push(`Se observa una mejora moderada del cumplimiento (de ${primerValor.toFixed(1)}% a ${ultimoValor.toFixed(1)}%)`)
  } else if (diferencia < -5) {
    partes.push(`Se observa un deterioro significativo del cumplimiento (de ${primerValor.toFixed(1)}% a ${ultimoValor.toFixed(1)}%)`)
  } else if (diferencia < -2) {
    partes.push(`Se observa un deterioro moderado del cumplimiento (de ${primerValor.toFixed(1)}% a ${ultimoValor.toFixed(1)}%)`)
  }

  // Comportamiento general
  if (promedio >= 90) {
    partes.push("manteniendo un nivel de desempeño excelente en el período analizado")
  } else if (promedio >= 80) {
    partes.push("manteniendo un nivel de desempeño satisfactorio")
  } else if (promedio >= 70) {
    partes.push("manteniendo un nivel de desempeño aceptable")
  } else {
    partes.push("requiriendo atención para mejorar los niveles de cumplimiento")
  }

  return partes.join(", ") + "."
}

/**
 * Genera texto ejecutivo para cumplimiento por auditoría
 */
function getExecutiveSummaryForAuditorias(
  cumplimientoPorAuditoria: Array<{
    auditoria: string
    cumple: number
    cumple_parcial: number
    no_cumple: number
    no_aplica: number
  }>,
  hasBreakdowns: boolean
): string {
  if (!hasBreakdowns || cumplimientoPorAuditoria.length === 0) {
    return "No se puede evaluar la variabilidad entre auditorías debido a la ausencia de datos de breakdown completos en los headers."
  }

  if (cumplimientoPorAuditoria.length === 1) {
    const aud = cumplimientoPorAuditoria[0]
    const total = aud.cumple + aud.cumple_parcial + aud.no_cumple + aud.no_aplica
    const pctCumplimiento = total > 0 ? ((aud.cumple + aud.cumple_parcial) / total) * 100 : 0
    return `Solo se cuenta con una auditoría con breakdown completo. Su nivel de cumplimiento es del ${pctCumplimiento.toFixed(1)}%.`
  }

  // Calcular porcentajes de cumplimiento por auditoría
  const auditoriasConPct = cumplimientoPorAuditoria.map((aud) => {
    const total = aud.cumple + aud.cumple_parcial + aud.no_cumple + aud.no_aplica
    const pctCumplimiento = total > 0 ? ((aud.cumple + aud.cumple_parcial) / total) * 100 : 0
    return { ...aud, pctCumplimiento, total }
  })

  const valores = auditoriasConPct.map((a) => a.pctCumplimiento)
  const promedio = valores.reduce((sum, v) => sum + v, 0) / valores.length
  const minimo = Math.min(...valores)
  const maximo = Math.max(...valores)
  const variabilidad = maximo - minimo

  const auditoriasCriticas = auditoriasConPct.filter((a) => a.pctCumplimiento < 70).length
  const auditoriasExcelentes = auditoriasConPct.filter((a) => a.pctCumplimiento >= 90).length

  const partes: string[] = []

  // Variabilidad
  if (variabilidad < 10) {
    partes.push(`Las auditorías muestran un desempeño consistente (rango entre ${minimo.toFixed(1)}% y ${maximo.toFixed(1)}%)`)
  } else if (variabilidad < 20) {
    partes.push(`Se observa variabilidad moderada entre auditorías (rango entre ${minimo.toFixed(1)}% y ${maximo.toFixed(1)}%)`)
  } else {
    partes.push(`Se observa alta variabilidad entre auditorías (rango entre ${minimo.toFixed(1)}% y ${maximo.toFixed(1)}%)`)
  }

  // Auditorías críticas
  if (auditoriasCriticas > 0) {
    partes.push(`con ${auditoriasCriticas} auditoría${auditoriasCriticas > 1 ? "s" : ""} que requieren atención prioritaria por cumplimiento inferior al 70%`)
  }

  // Auditorías excelentes
  if (auditoriasExcelentes > 0 && auditoriasCriticas === 0) {
    partes.push(`destacando ${auditoriasExcelentes} auditoría${auditoriasExcelentes > 1 ? "s" : ""} con desempeño excelente`)
  }

  return partes.join(", ") + "."
}

/**
 * Genera texto ejecutivo para ranking de operaciones
 */
function getExecutiveSummaryForRanking(
  ranking: Array<{ operacion: string; cumplimiento: number }>,
  isInverse: boolean,
  hasCumplimientoPct: boolean,
  hasOperaciones: boolean
): string {
  if (!hasCumplimientoPct || !hasOperaciones) {
    return "No se puede generar el ranking debido a la ausencia de operaciones o porcentajes de cumplimiento en los headers."
  }

  if (ranking.length === 0) {
    return "No hay datos suficientes para generar un ranking de operaciones."
  }

  const partes: string[] = []

  if (isInverse) {
    // Ranking inverso (menor cumplimiento)
    const peor = ranking[0]
    const promedio = ranking.reduce((sum, r) => sum + r.cumplimiento, 0) / ranking.length

    partes.push(`Las operaciones con menor cumplimiento promedio requieren atención prioritaria`)

    if (peor.cumplimiento < 50) {
      partes.push(`siendo "${peor.operacion}" la que presenta el nivel más crítico (${peor.cumplimiento.toFixed(1)}%)`)
    } else if (peor.cumplimiento < 70) {
      partes.push(`siendo "${peor.operacion}" la que requiere seguimiento inmediato (${peor.cumplimiento.toFixed(1)}%)`)
    } else {
      partes.push(`con "${peor.operacion}" en el nivel más bajo (${peor.cumplimiento.toFixed(1)}%)`)
    }

    const bajoUmbral = ranking.filter((r) => r.cumplimiento < 70).length
    if (bajoUmbral > 1) {
      partes.push(`identificándose ${bajoUmbral} operaciones con cumplimiento inferior al 70%`)
    }
  } else {
    // Ranking normal (mayor cumplimiento)
    const mejor = ranking[0]
    const promedio = ranking.reduce((sum, r) => sum + r.cumplimiento, 0) / ranking.length

    partes.push(`Se observan diferencias de desempeño entre operaciones`)

    if (mejor.cumplimiento >= 90) {
      partes.push(`destacando "${mejor.operacion}" con el mejor desempeño (${mejor.cumplimiento.toFixed(1)}%)`)
    } else {
      partes.push(`siendo "${mejor.operacion}" la operación con mayor cumplimiento (${mejor.cumplimiento.toFixed(1)}%)`)
    }

    const bajoUmbral = ranking.filter((r) => r.cumplimiento < 70).length
    if (bajoUmbral > 0) {
      partes.push(`mientras que ${bajoUmbral} operación${bajoUmbral > 1 ? "es" : ""} requiere${bajoUmbral === 1 ? "" : "n"} atención por cumplimiento inferior al 70%`)
    }
  }

  return partes.join(", ") + "."
}

/**
 * Guarda los datos de auditorías en localStorage para compartir entre páginas
 */
function saveAuditFilesToStorage(auditFiles: AuditFile[]) {
  if (typeof window !== "undefined") {
    try {
      // Serializar solo los datos necesarios (sin funciones, fechas como strings)
      const serialized = JSON.stringify(auditFiles, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString()
        }
        return value
      })
      localStorage.setItem("auditFiles", serialized)
    } catch (err) {
      console.error("Error al guardar auditFiles en localStorage:", err)
    }
  }
}

export function AuditDashboard({ auditFiles }: AuditDashboardProps) {
  const router = useRouter()

  // Guardar datos en localStorage cuando cambian
  useMemo(() => {
    saveAuditFilesToStorage(auditFiles)
  }, [auditFiles])

  // Detectar disponibilidad de datos desde headers
  const dataAvailability = useMemo(() => {
    if (auditFiles.length === 0) {
      return {
        hasBreakdowns: false,
        hasCumplimientoPct: false,
        hasFechas: false,
        hasOperaciones: false,
        hasItems: false,
      }
    }

    let hasBreakdowns = false
    let hasCumplimientoPct = false
    let hasFechas = false
    let hasOperaciones = false
    let hasItems = false

    auditFiles.forEach((file) => {
      // Verificar breakdowns (cantidad_cumple, cantidad_no_cumple, etc.)
      const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
      const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
      if (cumple !== null || noCumple !== null) {
        hasBreakdowns = true
      }

      // Verificar porcentaje de cumplimiento
      if (getCumplimientoPct(file.headers) !== null) {
        hasCumplimientoPct = true
      }

      // Verificar fechas
      if (normalizeDate(file.headers.fecha)) {
        hasFechas = true
      }

      // Verificar operaciones
      if (file.headers.operacion) {
        hasOperaciones = true
      }

      // Verificar items
      if (getHeaderNumber(file.headers, "cantidad_items") !== null) {
        hasItems = true
      }
    })

    return {
      hasBreakdowns,
      hasCumplimientoPct,
      hasFechas,
      hasOperaciones,
      hasItems,
    }
  }, [auditFiles])

  // KPIs globales
  const kpis = useMemo(() => {
    if (auditFiles.length === 0) {
      return {
        totalAuditorias: 0,
        totalItems: 0,
        cumplimientoPromedio: 0,
        totalIncumplimientos: 0,
      }
    }

    const totalAuditorias = auditFiles.length
    
    // Solo usar valores oficiales desde headers
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

    return {
      totalAuditorias,
      totalItems,
      cumplimientoPromedio: Math.round(cumplimientoPromedio * 100) / 100,
      totalIncumplimientos,
    }
  }, [auditFiles])

  // Distribución de cumplimiento
  const distribucionCumplimiento = useMemo(() => {
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

    return [
      { name: "Cumple", value: distribucion.cumple, color: "#22c55e" }, // Verde
      { name: "Cumple Parcial", value: distribucion.cumple_parcial, color: "#eab308" }, // Amarillo
      { name: "No Cumple", value: distribucion.no_cumple, color: "#ef4444" }, // Rojo
      { name: "No Aplica", value: distribucion.no_aplica, color: "#6b7280" }, // Gris
    ].filter((item) => item.value > 0)
  }, [auditFiles])

  // Cumplimiento por Auditoría (barra apilada)
  const cumplimientoPorAuditoria = useMemo(() => {
    const datos: Array<{
      auditoria: string
      cumple: number
      cumple_parcial: number
      no_cumple: number
      no_aplica: number
    }> = []

    auditFiles.forEach((file) => {
      // Leer valores desde headers (OBLIGATORIO: solo desde headers)
      const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
      const cumpleParcial = getHeaderNumber(file.headers, "cantidad_cumple_parcial")
      const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
      const noAplica = getHeaderNumber(file.headers, "cantidad_no_aplica")

      // Solo incluir si tiene todos los campos de breakdown
      if (
        cumple !== null &&
        cumpleParcial !== null &&
        noCumple !== null &&
        noAplica !== null
      ) {
        // Usar operacion si existe, sino fileName truncado
        const auditoriaLabel = file.headers.operacion
          ? String(file.headers.operacion).substring(0, 30)
          : file.fileName.length > 30
            ? `${file.fileName.substring(0, 27)}...`
            : file.fileName

        datos.push({
          auditoria: auditoriaLabel,
          cumple: cumple,
          cumple_parcial: cumpleParcial,
          no_cumple: noCumple,
          no_aplica: noAplica,
        })
      }
    })

    return datos
  }, [auditFiles])

  // Tendencia mensual de cumplimiento
  const tendenciaMensual = useMemo(() => {
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

    const tendencia = Array.from(mesesMap.entries())
      .map(([mes, data]) => {
        const promedio =
          data.cumplimientos.length > 0
            ? data.cumplimientos.reduce((sum, val) => sum + val, 0) / data.cumplimientos.length
            : 0

        const [year, month] = mes.split("-")
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
        const monthIndexA = monthNames.indexOf(mesA)
        const monthIndexB = monthNames.indexOf(mesB)
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB)
        return monthIndexA - monthIndexB
      })

    return tendencia
  }, [auditFiles])

  // Ranking de operaciones (Top 10 por % cumplimiento)
  const rankingOperaciones = useMemo(() => {
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

    const ranking = Array.from(operacionesMap.entries())
      .map(([operacion, data]) => ({
        operacion: String(operacion).substring(0, 30),
        cumplimiento:
          data.count > 0 ? Math.round((data.cumplimiento / data.count) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.cumplimiento - a.cumplimiento)
      .slice(0, 10)

    return ranking
  }, [auditFiles])

  // Ranking inverso de operaciones (Top 10 con MENOR % cumplimiento)
  const rankingInversoOperaciones = useMemo(() => {
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

    const ranking = Array.from(operacionesMap.entries())
      .map(([operacion, data]) => ({
        operacion: String(operacion).substring(0, 30),
        cumplimiento:
          data.count > 0 ? Math.round((data.cumplimiento / data.count) * 100) / 100 : 0,
      }))
      .sort((a, b) => a.cumplimiento - b.cumplimiento) // Orden inverso: menor a mayor
      .slice(0, 10)

    return ranking
  }, [auditFiles])

  // Indicador de calidad de datos
  const calidadDatos = useMemo(() => {
    let conBreakdownCompleto = 0
    let soloPorcentaje = 0
    let sinMetricas = 0

    auditFiles.forEach((file) => {
      const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
      const cumpleParcial = getHeaderNumber(file.headers, "cantidad_cumple_parcial")
      const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
      const noAplica = getHeaderNumber(file.headers, "cantidad_no_aplica")
      const cumplimientoPct = getCumplimientoPct(file.headers)

      const tieneBreakdownCompleto =
        cumple !== null &&
        cumpleParcial !== null &&
        noCumple !== null &&
        noAplica !== null

      if (tieneBreakdownCompleto) {
        conBreakdownCompleto++
      } else if (cumplimientoPct !== null) {
        soloPorcentaje++
      } else {
        sinMetricas++
      }
    })

    const total = auditFiles.length
    return {
      conBreakdownCompleto,
      soloPorcentaje,
      sinMetricas,
      total,
      pctBreakdownCompleto: total > 0 ? Math.round((conBreakdownCompleto / total) * 100) : 0,
      pctSoloPorcentaje: total > 0 ? Math.round((soloPorcentaje / total) * 100) : 0,
      pctSinMetricas: total > 0 ? Math.round((sinMetricas / total) * 100) : 0,
    }
  }, [auditFiles])

  // Alertas por umbral
  const alertasUmbral = useMemo(() => {
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

    return {
      bajo70,
      bajo50,
      total: bajo70 + bajo50,
    }
  }, [auditFiles])

  // Combinar todos los items de todas las auditorías
  const allItems = useMemo(() => {
    return auditFiles.flatMap((file) => file.items)
  }, [auditFiles])

  const chartConfig = {
    cumplimiento: {
      label: "% Cumplimiento",
      color: "#3b82f6", // Azul
    },
  }

  // Función para obtener color según porcentaje de cumplimiento
  const getCumplimientoColor = (porcentaje: number): string => {
    if (porcentaje >= 90) return "#22c55e" // Verde
    if (porcentaje >= 70) return "#eab308" // Amarillo
    if (porcentaje >= 50) return "#f97316" // Naranja
    return "#ef4444" // Rojo
  }

  if (auditFiles.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">
          No hay datos para mostrar el dashboard. Procesá los archivos primero.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerta informativa sobre datos faltantes */}
      {(!dataAvailability.hasBreakdowns || !dataAvailability.hasCumplimientoPct || !dataAvailability.hasFechas) && (
        <Alert variant="default" className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Información sobre los datos:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
              {!dataAvailability.hasBreakdowns && (
                <li>Los archivos Excel no incluyen desglose de cumplimiento (cumple/no cumple/no aplica). Algunos gráficos pueden estar vacíos.</li>
              )}
              {!dataAvailability.hasCumplimientoPct && (
                <li>No se encontró porcentaje de cumplimiento en los headers. Los gráficos de tendencia y ranking no se mostrarán.</li>
              )}
              {!dataAvailability.hasFechas && (
                <li>No se encontraron fechas válidas. El gráfico de tendencia mensual no se mostrará.</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Auditorías</p>
              <p className="text-3xl font-bold text-foreground mt-2">{kpis.totalAuditorias}</p>
            </div>
            <FileCheck className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Ítems Evaluados</p>
                {!dataAvailability.hasItems && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este valor proviene de los headers del Excel.</p>
                      <p>Si está en 0, el Excel no incluye este campo.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">{kpis.totalItems.toLocaleString()}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">% Cumplimiento Promedio</p>
                {!dataAvailability.hasCumplimientoPct && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este valor proviene de los headers del Excel.</p>
                      <p>Si está en 0%, el Excel no incluye porcentaje de cumplimiento.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">
                {kpis.cumplimientoPromedio.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Incumplimientos</p>
                {!dataAvailability.hasBreakdowns && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este valor proviene de los headers del Excel.</p>
                      <p>Si está en 0, el Excel no incluye desglose de incumplimientos.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">
                {kpis.totalIncumplimientos.toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Lectura Ejecutiva - KPIs */}
      <Card className="p-4 bg-muted/30 border-muted">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lectura Ejecutiva</p>
          <p className="text-sm text-foreground leading-relaxed">
            {getExecutiveSummaryForKPIs(
              kpis.totalAuditorias,
              kpis.cumplimientoPromedio,
              kpis.totalIncumplimientos,
              dataAvailability.hasCumplimientoPct,
              dataAvailability.hasBreakdowns
            )}
          </p>
        </div>
      </Card>

      {/* Incumplimientos detectados */}
      <NonComplianceList items={allItems} auditFiles={auditFiles} />

      {/* Estadísticas Ejecutivas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Indicador de Calidad de Datos */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Calidad de Datos</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Usa headers para clasificar auditorías:</p>
                    <ul className="list-disc ml-4 mt-1 text-xs">
                      <li>Breakdown completo: cantidad_cumple, cantidad_cumple_parcial, cantidad_no_cumple, cantidad_no_aplica</li>
                      <li>Solo porcentaje: cumplimiento_total_pct o porcentaje_cumplimiento</li>
                      <li>Sin métricas: ninguno de los anteriores</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                Clasificación de auditorías según métricas disponibles
              </p>
            </div>
            {calidadDatos.total > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">Con Breakdown Completo</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Todos los campos de cantidad mapeados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{calidadDatos.conBreakdownCompleto}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{calidadDatos.pctBreakdownCompleto}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div>
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Solo Porcentaje</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">Sin breakdown de cantidades</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{calidadDatos.soloPorcentaje}</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">{calidadDatos.pctSoloPorcentaje}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sin Métricas Finales</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">Sin porcentaje ni breakdown</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{calidadDatos.sinMetricas}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{calidadDatos.pctSinMetricas}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </Card>

        {/* Alertas por Umbral - Versión Expandida */}
        <Card className="p-6 border-orange-200 dark:border-orange-800">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Alertas de Cumplimiento</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Usa: headers.cumplimiento_total_pct o headers.porcentaje_cumplimiento</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                Auditorías que requieren atención por bajo cumplimiento
              </p>
            </div>
            {dataAvailability.hasCumplimientoPct ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">Cumplimiento &lt; 50%</p>
                      <p className="text-xs text-red-700 dark:text-red-300">Crítico - Requiere acción inmediata</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">{alertasUmbral.bajo50}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {auditFiles.length > 0 ? Math.round((alertasUmbral.bajo50 / auditFiles.length) * 100) : 0}% del total
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Cumplimiento &lt; 70%</p>
                      <p className="text-xs text-orange-700 dark:text-orange-300">Atención - Requiere seguimiento</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{alertasUmbral.bajo70}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      {auditFiles.length > 0 ? Math.round((alertasUmbral.bajo70 / auditFiles.length) * 100) : 0}% del total
                    </p>
                  </div>
                </div>
                {alertasUmbral.total === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Todas las auditorías tienen cumplimiento &ge; 70%</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No hay datos de cumplimiento disponibles</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Se requiere headers.cumplimiento_total_pct o headers.porcentaje_cumplimiento
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribución de cumplimiento */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Distribución de Cumplimiento</Label>
                {!dataAvailability.hasBreakdowns && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este gráfico requiere datos de breakdown desde los headers del Excel.</p>
                      <p>Campos necesarios: cantidad_cumple, cantidad_no_cumple, etc.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Distribución de ítems por estado de cumplimiento
              </p>
              <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lectura Ejecutiva</p>
                <p className="text-xs text-foreground leading-relaxed">
                  {getExecutiveSummaryForDistribution(distribucionCumplimiento, dataAvailability.hasBreakdowns)}
                </p>
              </div>
            </div>
            {distribucionCumplimiento.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={distribucionCumplimiento}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    innerRadius={0}
                    dataKey="value"
                  >
                    {distribucionCumplimiento.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={2} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No hay datos de distribución disponibles
                </p>
                {!dataAvailability.hasBreakdowns && (
                  <p className="text-xs text-muted-foreground/70">
                    Los archivos Excel procesados no incluyen desglose de cumplimiento en los headers.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Tendencia mensual */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Tendencia Mensual de Cumplimiento</Label>
                {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasFechas) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este gráfico requiere:</p>
                      <ul className="list-disc ml-4 mt-1">
                        <li>Porcentaje de cumplimiento en headers</li>
                        <li>Fechas válidas en headers</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Promedio de cumplimiento por mes
              </p>
              <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lectura Ejecutiva</p>
                <p className="text-xs text-foreground leading-relaxed">
                  {getExecutiveSummaryForTrend(tendenciaMensual, dataAvailability.hasCumplimientoPct, dataAvailability.hasFechas)}
                </p>
              </div>
            </div>
            {tendenciaMensual.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={tendenciaMensual}>
                  <defs>
                    <linearGradient id="colorCumplimiento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="mes" 
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    cursor={{ stroke: "#3b82f6", strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumplimiento"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, fill: "#2563eb" }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No hay datos de tendencia disponibles
                </p>
                {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasFechas) && (
                  <p className="text-xs text-muted-foreground/70">
                    {!dataAvailability.hasCumplimientoPct && !dataAvailability.hasFechas
                      ? "Faltan porcentajes de cumplimiento y fechas en los headers."
                      : !dataAvailability.hasCumplimientoPct
                        ? "Faltan porcentajes de cumplimiento en los headers."
                        : "Faltan fechas válidas en los headers."}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cumplimiento por Auditoría (barra apilada) */}
      <Card className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Cumplimiento por Auditoría</Label>
                {!dataAvailability.hasBreakdowns && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este gráfico requiere datos de breakdown desde los headers del Excel.</p>
                      <p>Campos necesarios: cantidad_cumple, cantidad_cumple_parcial, cantidad_no_cumple, cantidad_no_aplica</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Distribución de cumplimiento por auditoría (solo auditorías con breakdown completo)
              </p>
              <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lectura Ejecutiva</p>
                <p className="text-xs text-foreground leading-relaxed">
                  {getExecutiveSummaryForAuditorias(cumplimientoPorAuditoria, dataAvailability.hasBreakdowns)}
                </p>
              </div>
            </div>
            {cumplimientoPorAuditoria.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart
                  data={cumplimientoPorAuditoria}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    <linearGradient id="barCumple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="barCumpleParcial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#ca8a04" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="barNoCumple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="barNoAplica" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7280" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#4b5563" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="auditoria"
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    label={{ value: "Cantidad de ítems", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fill: "#6b7280" } }}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null
                      
                      const data = payload[0].payload
                      const total = data.cumple + data.cumple_parcial + data.no_cumple + data.no_aplica
                      
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <p className="font-semibold mb-2">{data.auditoria}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }} />
                                <span>Cumple:</span>
                              </div>
                              <span className="font-medium">{data.cumple}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#eab308" }} />
                                <span>Cumple Parcial:</span>
                              </div>
                              <span className="font-medium">{data.cumple_parcial}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }} />
                                <span>No Cumple:</span>
                              </div>
                              <span className="font-medium">{data.no_cumple}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#6b7280" }} />
                                <span>No Aplica:</span>
                              </div>
                              <span className="font-medium">{data.no_aplica}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t">
                              <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold">Total:</span>
                                <span className="font-bold">{total}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                    cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        cumple: "Cumple",
                        cumple_parcial: "Cumple Parcial",
                        no_cumple: "No Cumple",
                        no_aplica: "No Aplica",
                      }
                      return labels[value] || value
                    }}
                  />
                  <Bar
                    dataKey="cumple"
                    stackId="a"
                    fill="#22c55e"
                    name="cumple"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="cumple_parcial"
                    stackId="a"
                    fill="#eab308"
                    name="cumple_parcial"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="no_cumple"
                    stackId="a"
                    fill="#ef4444"
                    name="no_cumple"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="no_aplica"
                    stackId="a"
                    fill="#6b7280"
                    name="no_aplica"
                    radius={[0, 0, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No hay datos disponibles
                </p>
                {!dataAvailability.hasBreakdowns && (
                  <p className="text-xs text-muted-foreground/70">
                    Los archivos Excel procesados no incluyen desglose completo de cumplimiento en los headers.
                    Se requieren todos los campos: cantidad_cumple, cantidad_cumple_parcial, cantidad_no_cumple, cantidad_no_aplica
                  </p>
                )}
                {dataAvailability.hasBreakdowns && cumplimientoPorAuditoria.length === 0 && (
                  <p className="text-xs text-muted-foreground/70">
                    Ninguna auditoría tiene todos los campos de breakdown requeridos.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

      {/* Ranking de operaciones */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-lg font-semibold">Ranking de Operaciones</Label>
              {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasOperaciones) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Este gráfico requiere:</p>
                    <ul className="list-disc ml-4 mt-1">
                      <li>Porcentaje de cumplimiento en headers</li>
                      <li>Campo "operacion" en headers</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Top 10 operaciones por % de cumplimiento (click para ver detalles)
            </p>
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lectura Ejecutiva</p>
              <p className="text-xs text-foreground leading-relaxed">
                {getExecutiveSummaryForRanking(rankingOperaciones, false, dataAvailability.hasCumplimientoPct, dataAvailability.hasOperaciones)}
              </p>
            </div>
          </div>
          {rankingOperaciones.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px]">
              <BarChart data={rankingOperaciones} layout="vertical">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                    <stop offset="50%" stopColor="#eab308" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis 
                  dataKey="operacion" 
                  type="category" 
                  width={150}
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar 
                  dataKey="cumplimiento" 
                  radius={[0, 8, 8, 0]}
                  onClick={(data) => {
                    if (data && data.operacion) {
                      // Codificar el nombre de la operación para la URL
                      const operationId = encodeURIComponent(data.operacion)
                      router.push(`/dashboard/operation/${operationId}`)
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {rankingOperaciones.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCumplimientoColor(entry.cumplimiento)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                No hay datos de ranking disponibles
              </p>
              {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasOperaciones) && (
                <p className="text-xs text-muted-foreground/70">
                  {!dataAvailability.hasCumplimientoPct && !dataAvailability.hasOperaciones
                    ? "Faltan porcentajes de cumplimiento y operaciones en los headers."
                    : !dataAvailability.hasCumplimientoPct
                      ? "Faltan porcentajes de cumplimiento en los headers."
                      : "Faltan operaciones en los headers."}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Ranking Inverso de Operaciones */}
      <Card className="p-6 border-red-200 dark:border-red-800">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-lg font-semibold">Operaciones que Requieren Atención</Label>
              {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasOperaciones) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Usa:</p>
                    <ul className="list-disc ml-4 mt-1">
                      <li>headers.operacion</li>
                      <li>headers.cumplimiento_total_pct o headers.porcentaje_cumplimiento</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Top 10 operaciones con menor % de cumplimiento promedio (click para ver detalles)
            </p>
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lectura Ejecutiva</p>
              <p className="text-xs text-foreground leading-relaxed">
                {getExecutiveSummaryForRanking(rankingInversoOperaciones, true, dataAvailability.hasCumplimientoPct, dataAvailability.hasOperaciones)}
              </p>
            </div>
          </div>
          {rankingInversoOperaciones.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px]">
              <BarChart data={rankingInversoOperaciones} layout="vertical">
                <defs>
                  <linearGradient id="barGradientInverse" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                    <stop offset="50%" stopColor="#f97316" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#eab308" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis 
                  dataKey="operacion" 
                  type="category" 
                  width={150}
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "rgba(239, 68, 68, 0.1)" }}
                />
                <Bar 
                  dataKey="cumplimiento" 
                  radius={[0, 8, 8, 0]}
                  onClick={(data) => {
                    if (data && data.operacion) {
                      // Codificar el nombre de la operación para la URL
                      const operationId = encodeURIComponent(data.operacion)
                      router.push(`/dashboard/operation/${operationId}`)
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {rankingInversoOperaciones.map((entry, index) => (
                    <Cell key={`cell-inverse-${index}`} fill={getCumplimientoColor(entry.cumplimiento)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                No hay datos de ranking inverso disponibles
              </p>
              {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasOperaciones) && (
                <p className="text-xs text-muted-foreground/70">
                  {!dataAvailability.hasCumplimientoPct && !dataAvailability.hasOperaciones
                    ? "Faltan porcentajes de cumplimiento y operaciones en los headers."
                    : !dataAvailability.hasCumplimientoPct
                      ? "Faltan porcentajes de cumplimiento en los headers."
                      : "Faltan operaciones en los headers."}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
