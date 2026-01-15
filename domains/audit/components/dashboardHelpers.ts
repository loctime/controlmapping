import type { AuditFile } from "@/domains/audit"
import { normalizeDate } from "@/utils/date"

/**
 * Obtiene el porcentaje de cumplimiento oficial desde headers
 */
export function getCumplimientoPct(headers: AuditFile["headers"]): number | null {
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
export function getHeaderNumber(
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
 * Genera texto ejecutivo para KPIs generales
 */
export function getExecutiveSummaryForKPIs(
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
export function getExecutiveSummaryForDistribution(
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
export function getExecutiveSummaryForTrend(
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
export function getExecutiveSummaryForAuditorias(
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
export function getExecutiveSummaryForRanking(
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
