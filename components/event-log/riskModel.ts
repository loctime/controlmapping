/**
 * MODELO DE RIESGO UNIFICADO
 * 
 * Este módulo define el modelo de riesgo consistente para todo el sistema,
 * basado exclusivamente en los datos reales del Excel.
 * 
 * REGLA FUNDAMENTAL:
 * ==================
 * EVENTOS REALES (únicos):
 * - D1 => Fatiga (Parpadeo pesado)
 * - D3 => Distracción (Sin mirar al frente)
 * 
 * FACTORES DE SEVERIDAD (NO son eventos, son agravantes):
 * - Velocidad >= 80 km/h
 * - Reincidencia diaria (>= 3 eventos mismo día)
 * - Franja horaria dominante
 * 
 * USO:
 * - Todos los componentes deben usar estos helpers
 * - NO crear eventos inexistentes
 * - NO tratar factores como eventos
 * - Score: base = D1*3 + D3*2, con multiplicadores de factores
 * 
 * COMPONENTES QUE USAN ESTE MODELO:
 * - RiskDriversPanel
 * - RiskPriorityPanel
 * - RiskRankingOperators
 * - RiskRankingVehicles
 * - SecurityAlertPdf
 * - ExecutiveOnePagerView
 * - VehiculoEventosPdfReport
 */

import type { VehiculoEvento } from "@/domains/vehiculo/types"

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH"

export interface EventDistribution {
  d1: number // Fatiga
  d3: number // Distracción
  total: number
  pctFatiga: number
  pctDistraccion: number
}

export interface RiskFactors {
  altaVelocidad: number // Eventos con velocidad >= 80 km/h
  reincidencia: number // Días críticos (>= 3 eventos en el mismo día)
  franjaDominante: string | null // Franja horaria con más eventos (00-06, 06-12, 12-18, 18-24)
  franjaCount: number // Cantidad de eventos en la franja dominante
}

export interface RiskScore {
  score: number // 0-100
  level: RiskLevel
  base: number // D1*3 + D3*2
  factorVelocidad: number
  factorReincidencia: number
  scoreRaw: number // base * factorVelocidad * factorReincidencia
}

export interface EntityRiskProfile {
  name: string
  totalEventos: number
  distribution: EventDistribution
  factors: RiskFactors
  score: RiskScore
}

export interface OperatorRiskProfile extends EntityRiskProfile {
  operador: string
}

export interface VehicleRiskProfile extends EntityRiskProfile {
  vehiculo: string
}

/**
 * Cuenta eventos D1 y D3 de un conjunto de eventos
 */
export function countD1D3(eventos: VehiculoEvento[]): EventDistribution {
  const d1 = eventos.filter((e) => e.evento?.trim() === "D1").length
  const d3 = eventos.filter((e) => e.evento?.trim() === "D3").length
  const total = d1 + d3

  return {
    d1,
    d3,
    total,
    pctFatiga: total > 0 ? Math.round((d1 / total) * 100 * 10) / 10 : 0,
    pctDistraccion: total > 0 ? Math.round((d3 / total) * 100 * 10) / 10 : 0,
  }
}

/**
 * Calcula factores de riesgo (agravantes):
 * - Alta velocidad: eventos con velocidad >= 80 km/h
 * - Reincidencia: días con >= 3 eventos
 * - Franja dominante: franja horaria con más eventos
 */
export function computeFactors(eventos: VehiculoEvento[]): RiskFactors {
  // Alta velocidad: contar eventos con velocidad >= 80 km/h
  const altaVelocidad = eventos.filter((e) => e.velocidad >= 80).length

  // Reincidencia: contar días críticos (>= 3 eventos en el mismo día)
  const eventosPorDia = new Map<string, VehiculoEvento[]>()
  eventos.forEach((evento) => {
    const fecha = new Date(evento.fecha)
    fecha.setHours(0, 0, 0, 0)
    const diaKey = fecha.toISOString().split("T")[0] // YYYY-MM-DD
    if (!eventosPorDia.has(diaKey)) {
      eventosPorDia.set(diaKey, [])
    }
    eventosPorDia.get(diaKey)!.push(evento)
  })

  const diasCriticos = Array.from(eventosPorDia.values()).filter((eventosDia) => eventosDia.length >= 3).length

  // Franja dominante: detectar franja con más eventos
  const franjas = {
    "00-06": 0,
    "06-12": 0,
    "12-18": 0,
    "18-24": 0,
  }

  eventos.forEach((evento) => {
    const hora = evento.fecha.getHours()
    if (hora >= 0 && hora < 6) franjas["00-06"]++
    else if (hora >= 6 && hora < 12) franjas["06-12"]++
    else if (hora >= 12 && hora < 18) franjas["12-18"]++
    else if (hora >= 18 && hora < 24) franjas["18-24"]++
  })

  const franjaMasEventos = Object.entries(franjas).reduce((a, b) =>
    franjas[a[0] as keyof typeof franjas] > franjas[b[0] as keyof typeof franjas] ? a : b
  )

  return {
    altaVelocidad,
    reincidencia: diasCriticos,
    franjaDominante: franjaMasEventos[1] > 0 ? franjaMasEventos[0] : null,
    franjaCount: franjaMasEventos[1],
  }
}

/**
 * Calcula el score de riesgo basado en:
 * - Base: D1*3 + D3*2
 * - Factor velocidad: 1 + min(0.5, nAltaVelocidad / max(1, totalEventos))
 * - Factor reincidencia: 1 + min(0.5, diasCriticos / max(1, diasTotales))
 * - Score raw = base * factorVelocidad * factorReincidencia
 * - Normalización a 0-100 usando percentil 95 como referencia
 */
export function computeScore(
  distribution: EventDistribution,
  factors: RiskFactors,
  allScoresRaw: number[], // Para calcular percentil 95
  eventos?: VehiculoEvento[] // Para calcular días totales reales
): RiskScore {
  // Base: D1*3 + D3*2
  const base = distribution.d1 * 3 + distribution.d3 * 2

  // Factor velocidad: máximo +50%
  const factorVelocidad =
    distribution.total > 0
      ? 1 + Math.min(0.5, factors.altaVelocidad / Math.max(1, distribution.total))
      : 1

  // Factor reincidencia: máximo +50%
  // Calcular días totales desde los eventos reales si están disponibles
  let diasTotalesReal = 1
  if (eventos && eventos.length > 0) {
    const diasUnicos = new Set<string>()
    eventos.forEach((evento) => {
      const fecha = new Date(evento.fecha)
      fecha.setHours(0, 0, 0, 0)
      const diaKey = fecha.toISOString().split("T")[0]
      diasUnicos.add(diaKey)
    })
    diasTotalesReal = Math.max(1, diasUnicos.size)
  } else {
    // Aproximación conservadora: si hay reincidencia, asumimos al menos esos días
    diasTotalesReal = Math.max(1, factors.reincidencia > 0 ? factors.reincidencia : 1)
  }
  const factorReincidencia = 1 + Math.min(0.5, factors.reincidencia / diasTotalesReal)

  // Score raw
  const scoreRaw = base * factorVelocidad * factorReincidencia

  // Normalización a 0-100 usando percentil 95 como referencia
  // Si no hay scores de referencia, usar scoreRaw directamente
  let scoreRef = scoreRaw
  if (allScoresRaw.length > 0) {
    const sorted = [...allScoresRaw].sort((a, b) => a - b)
    const index95 = Math.floor(sorted.length * 0.95)
    scoreRef = sorted[index95] || sorted[sorted.length - 1] || scoreRaw
  }

  // Normalizar: min(100, (scoreRaw / scoreRef) * 100)
  const scoreNormalized = scoreRef > 0 ? Math.min(100, (scoreRaw / scoreRef) * 100) : 0

  return {
    score: Math.round(scoreNormalized * 10) / 10,
    level: classifyRiskLevel(scoreNormalized),
    base,
    factorVelocidad,
    factorReincidencia,
    scoreRaw,
  }
}

/**
 * Clasifica el score en niveles de riesgo
 */
export function classifyRiskLevel(score: number): RiskLevel {
  if (score <= 20) return "LOW"
  if (score <= 50) return "MEDIUM"
  return "HIGH"
}

/**
 * Detecta la franja horaria dominante
 */
export function dominantTimeBand(eventos: VehiculoEvento[]): string | null {
  const factors = computeFactors(eventos)
  return factors.franjaDominante
}

/**
 * Calcula días de reincidencia (días con >= 3 eventos)
 */
export function dailyRecurrenceDays(eventos: VehiculoEvento[]): number {
  const factors = computeFactors(eventos)
  return factors.reincidencia
}

/**
 * Calcula perfiles de riesgo por operador
 */
export function computeOperatorRiskProfiles(eventos: VehiculoEvento[]): OperatorRiskProfile[] {
  // Agrupar eventos por operador
  const eventosPorOperador: Record<string, VehiculoEvento[]> = {}

  eventos.forEach((evento) => {
    const operador = evento.operador?.trim() || "Sin operador"
    if (!eventosPorOperador[operador]) {
      eventosPorOperador[operador] = []
    }
    eventosPorOperador[operador].push(evento)
  })

  // Calcular distribución y factores para cada operador
  const profiles: OperatorRiskProfile[] = []
  const scoresRaw: number[] = []

  Object.entries(eventosPorOperador).forEach(([operador, eventosOperador]) => {
    const distribution = countD1D3(eventosOperador)
    const factors = computeFactors(eventosOperador)
    const score = computeScore(distribution, factors, [], eventosOperador) // Score temporal para obtener scoreRaw

    scoresRaw.push(score.scoreRaw)
    profiles.push({
      operador,
      name: operador,
      totalEventos: eventosOperador.length,
      distribution,
      factors,
      score,
    })
  })

  // Recalcular scores con percentil 95 de todos los scores raw
  const sortedScoresRaw = [...scoresRaw].sort((a, b) => a - b)
  const index95 = Math.floor(sortedScoresRaw.length * 0.95)
  const scoreRef = sortedScoresRaw[index95] || sortedScoresRaw[sortedScoresRaw.length - 1] || 1

  return profiles.map((profile) => {
    const scoreNormalized = scoreRef > 0 ? Math.min(100, (profile.score.scoreRaw / scoreRef) * 100) : 0
    return {
      ...profile,
      score: {
        ...profile.score,
        score: Math.round(scoreNormalized * 10) / 10,
        level: classifyRiskLevel(scoreNormalized),
      },
    }
  })
}

/**
 * Calcula perfiles de riesgo por vehículo
 */
export function computeVehicleRiskProfiles(eventos: VehiculoEvento[]): VehicleRiskProfile[] {
  // Agrupar eventos por vehículo
  const eventosPorVehiculo: Record<string, VehiculoEvento[]> = {}

  eventos.forEach((evento) => {
    const vehiculo = evento.vehiculo?.trim() || "Sin vehículo"
    if (!eventosPorVehiculo[vehiculo]) {
      eventosPorVehiculo[vehiculo] = []
    }
    eventosPorVehiculo[vehiculo].push(evento)
  })

  // Calcular distribución y factores para cada vehículo
  const profiles: VehicleRiskProfile[] = []
  const scoresRaw: number[] = []

  Object.entries(eventosPorVehiculo).forEach(([vehiculo, eventosVehiculo]) => {
    const distribution = countD1D3(eventosVehiculo)
    const factors = computeFactors(eventosVehiculo)
    const score = computeScore(distribution, factors, [], eventosVehiculo) // Score temporal para obtener scoreRaw

    scoresRaw.push(score.scoreRaw)
    profiles.push({
      vehiculo,
      name: vehiculo,
      totalEventos: eventosVehiculo.length,
      distribution,
      factors,
      score,
    })
  })

  // Recalcular scores con percentil 95 de todos los scores raw
  const sortedScoresRaw = [...scoresRaw].sort((a, b) => a - b)
  const index95 = Math.floor(sortedScoresRaw.length * 0.95)
  const scoreRef = sortedScoresRaw[index95] || sortedScoresRaw[sortedScoresRaw.length - 1] || 1

  return profiles.map((profile) => {
    const scoreNormalized = scoreRef > 0 ? Math.min(100, (profile.score.scoreRaw / scoreRef) * 100) : 0
    return {
      ...profile,
      score: {
        ...profile.score,
        score: Math.round(scoreNormalized * 10) / 10,
        level: classifyRiskLevel(scoreNormalized),
      },
    }
  })
}
