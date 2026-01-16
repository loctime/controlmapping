"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { AlertTriangle, Eye, Car, Users, Gauge } from "lucide-react"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import { countD1D3 } from "./riskModel"

interface CriticalSecurityDashboardProps {
  eventos: VehiculoEvento[]
}

/**
 * Formatea una fecha a formato legible (DD de mes de YYYY)
 */
function formatFecha(fecha: Date): string {
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
 * Verifica si hay alerta crítica: operador con >= 3 eventos D1 el mismo día
 */
function checkCriticalAlert(eventos: VehiculoEvento[]): {
  operador: string
  fecha: Date
  count: number
} | null {
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
  for (const [key, eventos] of eventsByOperatorAndDate.entries()) {
    if (eventos.length >= 3) {
      const [operador, fechaKey] = key.split("|")
      const fecha = new Date(fechaKey + "T00:00:00")
      return {
        operador,
        fecha,
        count: eventos.length,
      }
    }
  }

  return null
}

/**
 * Calcula eventos por franja horaria (D1 + D3)
 */
function calcularEventosPorFranja(eventos: VehiculoEvento[]) {
  const franjas = {
    "00-06": 0,
    "06-12": 0,
    "12-18": 0,
    "18-24": 0,
  }

  eventos.forEach((evento) => {
    const eventoCode = evento.evento?.trim()
    // Solo contar D1 y D3
    if (eventoCode !== "D1" && eventoCode !== "D3") return

    const hora = evento.fecha.getHours()
    if (hora >= 0 && hora < 6) franjas["00-06"]++
    else if (hora >= 6 && hora < 12) franjas["06-12"]++
    else if (hora >= 12 && hora < 18) franjas["12-18"]++
    else if (hora >= 18 && hora < 24) franjas["18-24"]++
  })

  return [
    { franja: "00-06", eventos: franjas["00-06"] },
    { franja: "06-12", eventos: franjas["06-12"] },
    { franja: "12-18", eventos: franjas["12-18"] },
    { franja: "18-24", eventos: franjas["18-24"] },
  ]
}

export function CriticalSecurityDashboard({ eventos }: CriticalSecurityDashboardProps) {
  // Verificar alerta crítica
  const criticalAlert = useMemo(() => checkCriticalAlert(eventos), [eventos])

  // Calcular KPIs
  const kpis = useMemo(() => {
    // Eventos críticos (D1 + D3)
    const eventosCriticos = eventos.filter(
      (e) => e.evento?.trim() === "D1" || e.evento?.trim() === "D3"
    ).length

    // Eventos de fatiga (D1)
    const eventosFatiga = eventos.filter((e) => e.evento?.trim() === "D1").length

    // Vehículos únicos
    const vehiculosUnicos = new Set(
      eventos
        .map((e) => e.vehiculo?.trim())
        .filter((v) => v && v !== "")
    ).size

    // Operadores únicos
    const operadoresUnicos = new Set(
      eventos
        .map((e) => e.operador?.trim())
        .filter((o) => o && o !== "")
    ).size

    // Velocidad máxima
    const velocidades = eventos.map((e) => e.velocidad).filter((v) => v > 0)
    const velocidadMaxima = velocidades.length > 0 ? Math.max(...velocidades) : 0

    return {
      eventosCriticos,
      eventosFatiga,
      vehiculosUnicos,
      operadoresUnicos,
      velocidadMaxima,
    }
  }, [eventos])

  // Distribución de eventos por tipo (D1 y D3)
  const eventosPorTipo = useMemo(() => {
    const distribution = countD1D3(eventos)
    const data = []

    if (distribution.d1 > 0) {
      data.push({
        name: "Fatiga",
        value: distribution.d1,
        porcentaje: distribution.pctFatiga,
        color: "#dc2626", // rojo
      })
    }

    if (distribution.d3 > 0) {
      data.push({
        name: "Distracción",
        value: distribution.d3,
        porcentaje: distribution.pctDistraccion,
        color: "#eab308", // amarillo
      })
    }

    return data
  }, [eventos])

  // Eventos por franja horaria
  const eventosPorFranja = useMemo(() => {
    return calcularEventosPorFranja(eventos)
  }, [eventos])

  // Colores para barras por franja horaria
  const getBarColor = (franja: string) => {
    switch (franja) {
      case "00-06":
        return "#dc2626" // rojo
      case "06-12":
        return "#ea580c" // naranja
      case "12-18":
        return "#eab308" // amarillo
      case "18-24":
        return "#3b82f6" // azul claro
      default:
        return "#6b7280"
    }
  }

  const chartConfig = {
    eventos: {
      label: "Eventos",
    },
  }

  return (
    <div id="alert-dashboard-export" className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* BLOQUE SUPERIOR — ALERTA PRINCIPAL */}
        {criticalAlert && (
          <Card className="w-full bg-red-50 border-red-200 rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-red-800">
                    ALERTA CRÍTICA DE SEGURIDAD
                  </h2>
                  <Badge className="bg-red-600 text-white px-3 py-1 text-xs font-semibold uppercase">
                    CRÍTICA
                  </Badge>
                </div>
                <p className="text-sm text-red-700">
                  Conductor {criticalAlert.operador} registró múltiples eventos de fatiga el{" "}
                  {formatFecha(criticalAlert.fecha)}. Riesgo alto de accidente.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* BLOQUE KPIs — INDICADORES CLAVE */}
        <div className="grid grid-cols-2 gap-4">
          {/* Eventos críticos */}
          <Card className="p-4 bg-white rounded-lg shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm font-medium text-gray-600">Eventos críticos</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{kpis.eventosCriticos}</p>
              <p className="text-xs text-gray-500">Fatiga y distracción</p>
            </div>
          </Card>

          {/* Eventos de fatiga */}
          <Card className="p-4 bg-white rounded-lg shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-pink-500" />
                <p className="text-sm font-medium text-gray-600">Eventos de fatiga</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{kpis.eventosFatiga}</p>
              <p className="text-xs text-gray-500">Parpadeo pesado</p>
            </div>
          </Card>

          {/* Vehículos únicos */}
          <Card className="p-4 bg-white rounded-lg shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-gray-600" />
                <p className="text-sm font-medium text-gray-600">Vehículos únicos</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{kpis.vehiculosUnicos}</p>
            </div>
          </Card>

          {/* Operadores únicos */}
          <Card className="p-4 bg-white rounded-lg shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                <p className="text-sm font-medium text-gray-600">Operadores únicos</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{kpis.operadoresUnicos}</p>
            </div>
          </Card>

          {/* Velocidad máxima */}
          <Card className="p-4 bg-white rounded-lg shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-gray-600" />
                <p className="text-sm font-medium text-gray-600">Velocidad máxima</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {kpis.velocidadMaxima > 0 ? `${kpis.velocidadMaxima} km/h` : "-"}
              </p>
            </div>
          </Card>
        </div>

        {/* BLOQUE GRÁFICOS (2 COLUMNAS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3A — EVENTOS POR TIPO (IZQUIERDA) */}
          <Card className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Eventos por tipo</h3>
            {eventosPorTipo.length > 0 ? (
              <div className="space-y-4">
                <ChartContainer config={chartConfig} className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventosPorTipo}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ porcentaje }) => `${porcentaje.toFixed(1)}%`}
                      >
                        {eventosPorTipo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="flex justify-center gap-4">
                  {eventosPorTipo.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-gray-600">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-sm text-gray-500">No hay datos para mostrar</p>
              </div>
            )}
          </Card>

          {/* 3B — EVENTOS POR FRANJA HORARIA (DERECHA) */}
          <Card className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Eventos por franja horaria
            </h3>
            {eventosPorFranja.some((f) => f.eventos > 0) ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventosPorFranja}>
                    <XAxis
                      dataKey="franja"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="eventos">
                      {eventosPorFranja.map((entry, index) => (
                        <Cell key={index} fill={getBarColor(entry.franja)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-sm text-gray-500">No hay datos para mostrar</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
