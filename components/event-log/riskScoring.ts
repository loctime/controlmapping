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

export interface RiskDrivers {
  fatigaPct: number
  velocidadPct: number
  reincidenciaPct: number
}

export interface RiskDriversByOperator {
  id: string
  operador: string
  drivers: RiskDrivers
}

export interface RiskDriversByVehicle {
  id: string
  vehiculo: string
  drivers: RiskDrivers
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

/**
 * Calcula los factores de riesgo (drivers) por operador
 * Los drivers explican qué contribuye al score de riesgo:
 * - Fatiga: eventos D1 (5 puntos cada uno)
 * - Velocidad: velocidad >= 80 km/h (2 puntos cada uno)
 * - Reincidencia: eventos D3 (3 puntos cada uno)
 * 
 * Los porcentajes suman 100% basándose en la contribución real al score
 */
export function calculateRiskDriversByOperator(
  eventos: VehiculoEvento[]
): RiskDriversByOperator[] {
  // Agrupar eventos por operador
  const eventosPorOperador: Record<string, VehiculoEvento[]> = {}

  eventos.forEach((evento) => {
    const operador = evento.operador?.trim() || "Sin operador"
    if (!eventosPorOperador[operador]) {
      eventosPorOperador[operador] = []
    }
    eventosPorOperador[operador].push(evento)
  })

  const drivers: RiskDriversByOperator[] = []

  Object.entries(eventosPorOperador).forEach(([operador, eventosOperador]) => {
    // Calcular puntos por factor
    let puntosFatiga = 0
    let puntosVelocidad = 0
    let puntosReincidencia = 0

    eventosOperador.forEach((evento) => {
      // Fatiga: eventos D1 aportan 5 puntos
      if (evento.evento?.trim() === "D1") {
        puntosFatiga += 5
      }
      // Reincidencia: eventos D3 aportan 3 puntos
      else if (evento.evento?.trim() === "D3") {
        puntosReincidencia += 3
      }

      // Velocidad: velocidad >= 80 aporta 2 puntos
      if (evento.velocidad >= 80) {
        puntosVelocidad += 2
      }
    })

    // Calcular total de puntos
    const totalPuntos = puntosFatiga + puntosVelocidad + puntosReincidencia

    // Normalizar a porcentajes (suman 100%)
    let fatigaPct = 0
    let velocidadPct = 0
    let reincidenciaPct = 0

    if (totalPuntos > 0) {
      fatigaPct = Math.round((puntosFatiga / totalPuntos) * 100 * 10) / 10
      velocidadPct = Math.round((puntosVelocidad / totalPuntos) * 100 * 10) / 10
      reincidenciaPct = Math.round((puntosReincidencia / totalPuntos) * 100 * 10) / 10

      // Ajustar para que sumen exactamente 100% (por redondeo)
      const suma = fatigaPct + velocidadPct + reincidenciaPct
      if (suma !== 100) {
        const diferencia = 100 - suma
        // Agregar la diferencia al factor más grande
        if (fatigaPct >= velocidadPct && fatigaPct >= reincidenciaPct) {
          fatigaPct += diferencia
        } else if (velocidadPct >= reincidenciaPct) {
          velocidadPct += diferencia
        } else {
          reincidenciaPct += diferencia
        }
      }
    }

    drivers.push({
      id: operador,
      operador,
      drivers: {
        fatigaPct,
        velocidadPct,
        reincidenciaPct,
      },
    })
  })

  return drivers
}

/**
 * Calcula los factores de riesgo (drivers) por vehículo
 * Misma lógica que por operador
 */
export function calculateRiskDriversByVehicle(
  eventos: VehiculoEvento[]
): RiskDriversByVehicle[] {
  // Agrupar eventos por vehículo
  const eventosPorVehiculo: Record<string, VehiculoEvento[]> = {}

  eventos.forEach((evento) => {
    const vehiculo = evento.vehiculo?.trim() || "Sin vehículo"
    if (!eventosPorVehiculo[vehiculo]) {
      eventosPorVehiculo[vehiculo] = []
    }
    eventosPorVehiculo[vehiculo].push(evento)
  })

  const drivers: RiskDriversByVehicle[] = []

  Object.entries(eventosPorVehiculo).forEach(([vehiculo, eventosVehiculo]) => {
    // Calcular puntos por factor
    let puntosFatiga = 0
    let puntosVelocidad = 0
    let puntosReincidencia = 0

    eventosVehiculo.forEach((evento) => {
      // Fatiga: eventos D1 aportan 5 puntos
      if (evento.evento?.trim() === "D1") {
        puntosFatiga += 5
      }
      // Reincidencia: eventos D3 aportan 3 puntos
      else if (evento.evento?.trim() === "D3") {
        puntosReincidencia += 3
      }

      // Velocidad: velocidad >= 80 aporta 2 puntos
      if (evento.velocidad >= 80) {
        puntosVelocidad += 2
      }
    })

    // Calcular total de puntos
    const totalPuntos = puntosFatiga + puntosVelocidad + puntosReincidencia

    // Normalizar a porcentajes (suman 100%)
    let fatigaPct = 0
    let velocidadPct = 0
    let reincidenciaPct = 0

    if (totalPuntos > 0) {
      fatigaPct = Math.round((puntosFatiga / totalPuntos) * 100 * 10) / 10
      velocidadPct = Math.round((puntosVelocidad / totalPuntos) * 100 * 10) / 10
      reincidenciaPct = Math.round((puntosReincidencia / totalPuntos) * 100 * 10) / 10

      // Ajustar para que sumen exactamente 100% (por redondeo)
      const suma = fatigaPct + velocidadPct + reincidenciaPct
      if (suma !== 100) {
        const diferencia = 100 - suma
        // Agregar la diferencia al factor más grande
        if (fatigaPct >= velocidadPct && fatigaPct >= reincidenciaPct) {
          fatigaPct += diferencia
        } else if (velocidadPct >= reincidenciaPct) {
          velocidadPct += diferencia
        } else {
          reincidenciaPct += diferencia
        }
      }
    }

    drivers.push({
      id: vehiculo,
      vehiculo,
      drivers: {
        fatigaPct,
        velocidadPct,
        reincidenciaPct,
      },
    })
  })

  return drivers
}
