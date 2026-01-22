import type { VehiculoEvento } from "@/domains/vehiculo/types"
import { checkCriticalFatigueAlert, generateCriticalAlertMessage } from "@/domains/vehiculo/criticalAlert"

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "OK"

export interface SecurityAlert {
  severity: AlertSeverity
  code: string
  message: string
  relatedOperator?: string
  relatedVehicle?: string
  count?: number
  date?: Date
}

/**
 * Genera una alerta de seguridad basada en reglas automáticas sobre eventos vehiculares
 * Retorna la alerta de mayor severidad encontrada, o OK si no hay alertas
 */
export function generateSecurityBanner(events: VehiculoEvento[]): SecurityAlert {
  if (!events || events.length === 0) {
    return {
      severity: "OK",
      code: "NO_EVENTS",
      message: "Sin alertas críticas de seguridad detectadas.",
    }
  }

  // ========================================================================
  // REGLA 1: ALERTA CRÍTICA – FATIGA
  // Condición: mismo operador, >= 3 eventos D1 el mismo día
  // ========================================================================
  const criticalAlert = checkCriticalFatigueAlert(events)
  if (criticalAlert) {
    return {
      severity: "CRITICAL",
      code: "CRITICAL_FATIGUE",
      message: generateCriticalAlertMessage(criticalAlert),
      relatedOperator: criticalAlert.operador,
      count: criticalAlert.totalEventos,
      date: criticalAlert.fechaInicio,
    }
  }

  // ========================================================================
  // REGLA 2: ALERTA ALTA – VELOCIDAD + FATIGA / DISTRACCIÓN
  // Condición: velocidad >= 80 AND (evento === "D1" OR evento === "D3")
  // ========================================================================
  const highAlert = checkHighSpeedAlert(events)
  if (highAlert) {
    return highAlert
  }

  // ========================================================================
  // REGLA 3: ALERTA MEDIA – REINCIDENCIA VEHÍCULO
  // Condición: mismo vehículo, >= 10 eventos totales en el período
  // ========================================================================
  const mediumAlert = checkMediumVehicleRecurrence(events)
  if (mediumAlert) {
    return mediumAlert
  }

  // Sin alertas detectadas
  return {
    severity: "OK",
    code: "NO_ALERTS",
    message: "Sin alertas críticas de seguridad detectadas.",
  }
}


/**
 * Verifica alerta alta de velocidad + fatiga/distracción
 * Velocidad >= 80 AND (evento === "D1" OR evento === "D3")
 */
function checkHighSpeedAlert(events: VehiculoEvento[]): SecurityAlert | null {
  // Buscar el primer evento que cumpla la condición
  const highSpeedEvent = events.find(
    (evento) =>
      evento.velocidad >= 80 &&
      (evento.evento === "D1" || evento.evento === "D3") &&
      evento.vehiculo &&
      evento.vehiculo.trim() !== ""
  )

  if (highSpeedEvent) {
    return {
      severity: "HIGH",
      code: "HIGH_SPEED_RISK",
      message: `Evento de riesgo detectado a alta velocidad (${highSpeedEvent.velocidad} km/h) en vehículo ${highSpeedEvent.vehiculo}.`,
      relatedVehicle: highSpeedEvent.vehiculo,
      count: 1,
    }
  }

  return null
}

/**
 * Verifica alerta media de reincidencia de vehículo
 * Mismo vehículo con >= 10 eventos totales en el período
 */
function checkMediumVehicleRecurrence(events: VehiculoEvento[]): SecurityAlert | null {
  // Agrupar eventos por vehículo
  const eventsByVehicle = new Map<string, VehiculoEvento[]>()

  events.forEach((evento) => {
    if (!evento.vehiculo || evento.vehiculo.trim() === "") return

    const vehiculo = evento.vehiculo.trim()
    if (!eventsByVehicle.has(vehiculo)) {
      eventsByVehicle.set(vehiculo, [])
    }
    eventsByVehicle.get(vehiculo)!.push(evento)
  })

  // Buscar vehículos con >= 10 eventos
  for (const [vehiculo, eventos] of eventsByVehicle.entries()) {
    if (eventos.length >= 10) {
      return {
        severity: "MEDIUM",
        code: "VEHICLE_RECURRENCE",
        message: `Vehículo ${vehiculo} presenta alta reincidencia de eventos críticos.`,
        relatedVehicle: vehiculo,
        count: eventos.length,
      }
    }
  }

  return null
}

