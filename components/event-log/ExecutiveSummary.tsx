"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import type { SecurityAlert } from "./securityAlerts"

interface ExecutiveSummaryProps {
  eventos: VehiculoEvento[]
  kpisEjecutivos: {
    eventosCriticos: number
    eventosFatiga: number
    vehiculosUnicos: number
    operadoresUnicos: number
    velocidadMaxima: number
  }
  securityAlert: SecurityAlert
}

export function ExecutiveSummary({
  eventos,
  kpisEjecutivos,
  securityAlert,
}: ExecutiveSummaryProps) {
  const resumenTexto = useMemo(() => {
    const totalEventos = eventos.length
    const eventosFatiga = kpisEjecutivos.eventosFatiga
    const eventosCriticos = kpisEjecutivos.eventosCriticos
    const vehiculosUnicos = kpisEjecutivos.vehiculosUnicos
    const operadoresUnicos = kpisEjecutivos.operadoresUnicos

    // Calcular porcentaje de eventos de fatiga
    const porcentajeFatiga =
      totalEventos > 0 ? Math.round((eventosFatiga / totalEventos) * 100) : 0

    // Calcular franja horaria con más eventos
    const franjas = [
      { nombre: "00-06", inicio: 0, fin: 6 },
      { nombre: "06-12", inicio: 6, fin: 12 },
      { nombre: "12-18", inicio: 12, fin: 18 },
      { nombre: "18-24", inicio: 18, fin: 24 },
    ]

    const conteoFranjas: Record<string, number> = {
      "00-06": 0,
      "06-12": 0,
      "12-18": 0,
      "18-24": 0,
    }

    eventos.forEach((evento) => {
      const hora = evento.fecha.getHours()
      for (const franja of franjas) {
        if (hora >= franja.inicio && hora < franja.fin) {
          conteoFranjas[franja.nombre]++
          break
        }
      }
    })

    const franjaMasEventos = Object.entries(conteoFranjas).reduce((a, b) =>
      conteoFranjas[a[0]] > conteoFranjas[b[0]] ? a : b
    )

    // Construir el texto del resumen
    const partes: string[] = []

    // Primera parte: Total de eventos y predominio
    if (totalEventos > 0) {
      partes.push(
        `Durante el período analizado se registraron ${totalEventos.toLocaleString()} evento${totalEventos !== 1 ? "s" : ""}`
      )

      if (eventosFatiga > 0 && porcentajeFatiga >= 50) {
        partes.push(
          `con predominio de eventos de fatiga (${porcentajeFatiga}%)`
        )
      } else if (eventosCriticos > 0) {
        const porcentajeCriticos = Math.round(
          (eventosCriticos / totalEventos) * 100
        )
        partes.push(
          `con ${porcentajeCriticos}% de eventos críticos de seguridad`
        )
      }
    }

    // Segunda parte: Alertas
    if (securityAlert.severity !== "OK") {
      const severidadTexto =
        securityAlert.severity === "CRITICAL"
          ? "crítica"
          : securityAlert.severity === "HIGH"
          ? "alta"
          : "media"

      if (securityAlert.count) {
        partes.push(
          `Se detectó una alerta ${severidadTexto} de seguridad, asociada a ${securityAlert.count} evento${securityAlert.count !== 1 ? "s" : ""}`
        )
      } else {
        partes.push(`Se detectó una alerta ${severidadTexto} de seguridad`)
      }

      // Agregar contexto si hay reincidencia
      if (operadoresUnicos < eventosCriticos / 2) {
        partes.push("con reincidencia de eventos en operadores específicos")
      }
    }

    // Tercera parte: Franja horaria
    if (franjaMasEventos[1] > 0) {
      const horaInicio = franjaMasEventos[0].split("-")[0]
      const horaFin = franjaMasEventos[0].split("-")[1]
      partes.push(
        `La mayor concentración de eventos ocurrió en la franja ${horaInicio}–${horaFin} h, lo que sugiere revisar turnos y descansos`
      )
    }

    // Cuarta parte: Contexto adicional si aplica
    if (vehiculosUnicos > 0 && operadoresUnicos > 0) {
      const ratioEventosPorOperador = totalEventos / operadoresUnicos
      if (ratioEventosPorOperador > 5) {
        partes.push(
          `Se observa una alta concentración de eventos por operador, recomendando capacitación adicional`
        )
      }
    }

    return partes.join(". ") + "."
  }, [eventos, kpisEjecutivos, securityAlert])

  return (
    <Card className="p-6">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Resumen Ejecutivo</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {resumenTexto}
        </p>
      </div>
    </Card>
  )
}
