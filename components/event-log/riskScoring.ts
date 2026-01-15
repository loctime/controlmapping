import type { VehiculoEvento } from "@/domains/vehiculo/types"

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH"

export interface RiskScore {
  name: string
  score: number
  level: RiskLevel
  totalEventos: number
  eventosFatiga: number
  eventosCriticos: number
}

export interface RiskScoreByOperator extends RiskScore {
  operador: string
}

export interface RiskScoreByVehicle extends RiskScore {
  vehiculo: string
}

/**
 * Calcula el score de riesgo para un conjunto de eventos
 * Reglas:
 * - Evento D1 → 5 puntos
 * - Evento D3 → 3 puntos
 * - Velocidad >= 80 km/h → +2 puntos extra
 * 
 * El score se normaliza a escala 0-100
 */
function calculateEventScore(evento: VehiculoEvento): number {
  let score = 0

  // Evento D1 (fatiga) → 5 puntos
  if (evento.evento?.trim() === "D1") {
    score += 5
  }
  // Evento D3 (distracción) → 3 puntos
  else if (evento.evento?.trim() === "D3") {
    score += 3
  }

  // Velocidad >= 80 km/h → +2 puntos extra
  if (evento.velocidad >= 80) {
    score += 2
  }

  return score
}

/**
 * Normaliza el score a escala 0-100
 * Usa una función logarítmica para suavizar la distribución
 */
function normalizeScore(rawScore: number, maxPossibleScore: number): number {
  if (maxPossibleScore === 0) return 0
  
  // Normalización simple: (score / maxPossibleScore) * 100
  // Pero limitamos a 100
  const normalized = Math.min((rawScore / maxPossibleScore) * 100, 100)
  
  return Math.round(normalized * 10) / 10 // Redondear a 1 decimal
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
 * Calcula el score de riesgo por operador
 */
export function calculateRiskScoreByOperator(
  eventos: VehiculoEvento[]
): RiskScoreByOperator[] {
  // Agrupar eventos por operador
  const eventosPorOperador: Record<string, VehiculoEvento[]> = {}

  eventos.forEach((evento) => {
    const operador = evento.operador?.trim() || "Sin operador"
    if (!eventosPorOperador[operador]) {
      eventosPorOperador[operador] = []
    }
    eventosPorOperador[operador].push(evento)
  })

  // Calcular scores
  const scores: RiskScoreByOperator[] = []

  Object.entries(eventosPorOperador).forEach(([operador, eventosOperador]) => {
    // Calcular score bruto
    let rawScore = 0
    let eventosFatiga = 0
    let eventosCriticos = 0

    eventosOperador.forEach((evento) => {
      const eventScore = calculateEventScore(evento)
      rawScore += eventScore

      if (evento.evento?.trim() === "D1") {
        eventosFatiga++
        eventosCriticos++
      } else if (evento.evento?.trim() === "D3") {
        eventosCriticos++
      }
    })

    // Calcular score máximo posible (asumiendo todos eventos críticos con velocidad alta)
    // Máximo por evento: 5 (D1) + 2 (velocidad) = 7 puntos
    const maxPossibleScore = eventosOperador.length * 7

    // Normalizar score
    const normalizedScore = normalizeScore(rawScore, maxPossibleScore)

    scores.push({
      operador,
      name: operador,
      score: normalizedScore,
      level: classifyRiskLevel(normalizedScore),
      totalEventos: eventosOperador.length,
      eventosFatiga,
      eventosCriticos,
    })
  })

  // Ordenar de mayor a menor riesgo
  return scores.sort((a, b) => b.score - a.score)
}

/**
 * Calcula el score de riesgo por vehículo
 */
export function calculateRiskScoreByVehicle(
  eventos: VehiculoEvento[]
): RiskScoreByVehicle[] {
  // Agrupar eventos por vehículo
  const eventosPorVehiculo: Record<string, VehiculoEvento[]> = {}

  eventos.forEach((evento) => {
    const vehiculo = evento.vehiculo?.trim() || "Sin vehículo"
    if (!eventosPorVehiculo[vehiculo]) {
      eventosPorVehiculo[vehiculo] = []
    }
    eventosPorVehiculo[vehiculo].push(evento)
  })

  // Calcular scores
  const scores: RiskScoreByVehicle[] = []

  Object.entries(eventosPorVehiculo).forEach(([vehiculo, eventosVehiculo]) => {
    // Calcular score bruto
    let rawScore = 0
    let eventosFatiga = 0
    let eventosCriticos = 0

    eventosVehiculo.forEach((evento) => {
      const eventScore = calculateEventScore(evento)
      rawScore += eventScore

      if (evento.evento?.trim() === "D1") {
        eventosFatiga++
        eventosCriticos++
      } else if (evento.evento?.trim() === "D3") {
        eventosCriticos++
      }
    })

    // Calcular score máximo posible
    const maxPossibleScore = eventosVehiculo.length * 7

    // Normalizar score
    const normalizedScore = normalizeScore(rawScore, maxPossibleScore)

    scores.push({
      vehiculo,
      name: vehiculo,
      score: normalizedScore,
      level: classifyRiskLevel(normalizedScore),
      totalEventos: eventosVehiculo.length,
      eventosFatiga,
      eventosCriticos,
    })
  })

  // Ordenar de mayor a menor riesgo
  return scores.sort((a, b) => b.score - a.score)
}
