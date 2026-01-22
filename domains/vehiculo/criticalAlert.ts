import type { VehiculoEvento } from "./types"

/**
 * Interfaz para la alerta crítica de fatiga
 */
export interface CriticalFatigueAlert {
  operador: string
  fechaInicio: Date
  fechaFin: Date
  totalEventos: number
  isCritical: true
}

/**
 * Verifica si hay alerta crítica: operador con >= 3 eventos D1 el mismo día
 * Devuelve el rango de fechas de todos los eventos D1 y D3 del operador crítico
 */
export function checkCriticalFatigueAlert(eventos: VehiculoEvento[]): CriticalFatigueAlert | null {
  const eventsByOperatorAndDate = new Map<string, VehiculoEvento[]>()

  eventos.forEach((evento) => {
    // Solo eventos D1 (fatiga)
    if (evento.evento?.trim() !== "D1") return

    // Filtrar eventos sin operador válido
    if (!evento.operador || evento.operador.trim() === "") return

    // Obtener fecha sin hora (solo día)
    const fechaDia = new Date(evento.fecha)
    fechaDia.setHours(0, 0, 0, 0)
    const fechaKey = fechaDia.toISOString().split("T")[0]

    // Clave: operador + fecha
    const key = `${evento.operador.trim()}|${fechaKey}`

    if (!eventsByOperatorAndDate.has(key)) {
      eventsByOperatorAndDate.set(key, [])
    }
    eventsByOperatorAndDate.get(key)!.push(evento)
  })

  // Buscar operadores con >= 3 eventos D1 el mismo día
  let operadorCritico: string | null = null
  
  for (const [key, eventos] of eventsByOperatorAndDate.entries()) {
    if (eventos.length >= 3) {
      const [operador] = key.split("|")
      operadorCritico = operador
      break
    }
  }

  if (!operadorCritico) {
    return null
  }

  // Filtrar todos los eventos D1 y D3 del operador crítico
  const eventosCriticosOperador = eventos.filter((evento) => {
    const eventoCode = evento.evento?.trim()
    return evento.operador?.trim() === operadorCritico && 
           (eventoCode === "D1" || eventoCode === "D3")
  })

  if (eventosCriticosOperador.length === 0) {
    return null
  }

  // Calcular fecha de inicio y fin
  const fechas = eventosCriticosOperador.map(e => new Date(e.fecha))
  const fechaInicio = new Date(Math.min(...fechas.map(f => f.getTime())))
  const fechaFin = new Date(Math.max(...fechas.map(f => f.getTime())))

  return {
    operador: operadorCritico,
    fechaInicio,
    fechaFin,
    totalEventos: eventosCriticosOperador.length,
    isCritical: true,
  }
}

/**
 * Formatea una fecha a formato legible (DD de mes de YYYY)
 */
export function formatFecha(fecha: Date): string {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ]
  const dia = fecha.getDate()
  const mes = meses[fecha.getMonth()]
  const año = fecha.getFullYear()
  return `${dia} de ${mes} de ${año}`
}

/**
 * Genera el mensaje de alerta crítica basado en el rango de fechas
 */
export function generateCriticalAlertMessage(alert: CriticalFatigueAlert): string {
  const { operador, fechaInicio, fechaFin } = alert
  
  if (fechaInicio.getTime() === fechaFin.getTime()) {
    return `Conductor ${operador} registró múltiples eventos de fatiga el ${formatFecha(fechaInicio)}. Riesgo alto de accidente.`
  } else {
    return `Conductor ${operador} registró múltiples eventos de fatiga entre el ${formatFecha(fechaInicio)} y el ${formatFecha(fechaFin)}. Riesgo alto de accidente.`
  }
}
