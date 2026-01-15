"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import type { VehiculoEvento } from "@/domains/vehiculo/types"

interface EventChartsSectionProps {
  eventos: VehiculoEvento[]
}

// Colores para tipos de evento
const EVENTO_COLORS: Record<string, string> = {
  D1: "#dc2626", // rojo para fatiga
  D3: "#ea580c", // naranja para distracción
}

// Función para obtener el color de un tipo de evento
const getEventoColor = (evento: string): string => {
  return EVENTO_COLORS[evento] || "hsl(var(--chart-1))"
}

// Función para obtener la etiqueta legible de un tipo de evento
const getEventoLabel = (evento: string): string => {
  const labels: Record<string, string> = {
    D1: "Fatiga",
    D3: "Distracción",
  }
  return labels[evento] || evento
}

export function EventChartsSection({ eventos }: EventChartsSectionProps) {
  // Gráfico 1: Eventos por tipo (Pie/Donut)
  const eventosPorTipo = useMemo(() => {
    const conteo: Record<string, number> = {}
    
    eventos.forEach((evento) => {
      const tipo = evento.evento?.trim() || "Desconocido"
      conteo[tipo] = (conteo[tipo] || 0) + 1
    })

    return Object.entries(conteo)
      .map(([tipo, cantidad]) => ({
        name: getEventoLabel(tipo),
        value: cantidad,
        tipo,
        color: getEventoColor(tipo),
      }))
      .sort((a, b) => b.value - a.value)
  }, [eventos])

  // Gráfico 2: Eventos por franja horaria (Barras)
  const eventosPorFranja = useMemo(() => {
    const franjas = [
      { nombre: "00-06", inicio: 0, fin: 6 },
      { nombre: "06-12", inicio: 6, fin: 12 },
      { nombre: "12-18", inicio: 12, fin: 18 },
      { nombre: "18-24", inicio: 18, fin: 24 },
    ]

    const conteo: Record<string, number> = {
      "00-06": 0,
      "06-12": 0,
      "12-18": 0,
      "18-24": 0,
    }

    eventos.forEach((evento) => {
      const hora = evento.fecha.getHours()
      for (const franja of franjas) {
        if (hora >= franja.inicio && hora < franja.fin) {
          conteo[franja.nombre]++
          break
        }
      }
    })

    return franjas.map((franja) => ({
      franja: franja.nombre,
      eventos: conteo[franja.nombre],
    }))
  }, [eventos])

  // Configuración de gráficos
  const chartConfig = {
    eventos: {
      label: "Eventos",
      color: "hsl(var(--chart-1))",
    },
  }

  // Si no hay eventos, mostrar empty state
  if (eventos.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            No hay eventos suficientes para mostrar gráficos
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico: Eventos por tipo (Pie/Donut) */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Eventos por Tipo</h3>
              <p className="text-sm text-muted-foreground">
                Distribución de eventos según su tipo
              </p>
            </div>
            {eventosPorTipo.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={eventosPorTipo}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={40}
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                    }
                  >
                    {eventosPorTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No hay datos para mostrar
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Gráfico: Eventos por franja horaria (Barras) */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Eventos por Franja Horaria</h3>
              <p className="text-sm text-muted-foreground">
                Distribución de eventos a lo largo del día
              </p>
            </div>
            {eventosPorFranja.some((f) => f.eventos > 0) ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={eventosPorFranja}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="franja"
                    tickFormatter={(value) => `${value}h`}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="eventos" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No hay datos para mostrar
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
