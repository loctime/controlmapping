"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from "recharts"
import { AlertTriangle, Eye, Car, Users, Gauge, EyeOff, Activity } from "lucide-react"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import { countD1D3 } from "./riskModel"
import { DashboardIcon } from "./DashboardIcon"
import { KpiCard } from "./KpiCard"

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

    // Eventos de distracción (D3)
    const eventosDistraccion = eventos.filter((e) => e.evento?.trim() === "D3").length

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
      eventosDistraccion,
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
    <div id="alert-dashboard-export" className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* BLOQUE SUPERIOR — ALERTA PRINCIPAL (HERO BANNER) */}
        {criticalAlert && (
          <Card className="w-full rounded-2xl shadow-xl border border-red-200/50 overflow-hidden bg-gradient-to-br from-[#FEE2E2] via-[#FFF5F5] to-white p-8">
            <div className="flex items-start gap-6">
              {/* Ícono grande en círculo con animación */}
              <div className="flex-shrink-0">
                <DashboardIcon icon={AlertTriangle} color="critical" size="lg" animate={true} />
              </div>
              
              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-6 mb-3">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-red-900 mb-3 tracking-tight">
                      ALERTA CRÍTICA DE SEGURIDAD
                    </h2>
                    <p className="text-base text-red-800 leading-relaxed">
                      Conductor <span className="font-semibold">{criticalAlert.operador}</span> registró múltiples eventos de fatiga el{" "}
                      <span className="font-semibold">{formatFecha(criticalAlert.fecha)}</span>. Riesgo alto de accidente.
                    </p>
                  </div>
                  <Badge className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex-shrink-0">
                    CRÍTICA
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* FILA 2: KPIs PRINCIPALES (3 columnas) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Eventos críticos */}
          <KpiCard
            icon={Activity}
            iconColor="critical"
            value={kpis.eventosCriticos}
            title="Eventos críticos"
            subtitle="Fatiga y distracción"
          />

          {/* Eventos de fatiga */}
          <KpiCard
            icon={Eye}
            iconColor="warning"
            value={kpis.eventosFatiga}
            title="Eventos de fatiga"
            subtitle="Parpadeo pesado"
          />

          {/* Eventos de distracción */}
          <KpiCard
            icon={EyeOff}
            iconColor="yellow"
            value={kpis.eventosDistraccion}
            title="Eventos de distracción"
            subtitle="Sin mirar al frente"
          />
        </div>

        {/* FILA 3: KPIs OPERATIVOS (3 columnas) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vehículos únicos */}
          <KpiCard
            icon={Car}
            iconColor="gray"
            value={kpis.vehiculosUnicos}
            title="Vehículos únicos"
          />

          {/* Operadores únicos */}
          <KpiCard
            icon={Users}
            iconColor="gray"
            value={kpis.operadoresUnicos}
            title="Operadores únicos"
          />

          {/* Velocidad máxima */}
          <KpiCard
            icon={Gauge}
            iconColor="gray"
            value={kpis.velocidadMaxima > 0 ? `${kpis.velocidadMaxima} km/h` : "-"}
            title="Velocidad máxima"
          />
        </div>

        {/* BLOQUE GRÁFICOS (2 COLUMNAS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 3A — EVENTOS POR TIPO (IZQUIERDA) */}
          <Card className="p-8 bg-white rounded-2xl shadow-md border-0">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Eventos por tipo</h3>
            {eventosPorTipo.length > 0 ? (
              <div className="space-y-6">
                <ChartContainer config={chartConfig} className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={eventosPorTipo}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={40}
                        label={({ name, porcentaje }) => `${name}: ${porcentaje.toFixed(1)}%`}
                        labelLine={false}
                      >
                        {eventosPorTipo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={2} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number, name: string) => [`${value} eventos`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="flex justify-center gap-6 pt-2">
                  {eventosPorTipo.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-sm text-gray-500">No hay datos para mostrar</p>
              </div>
            )}
          </Card>

          {/* 3B — EVENTOS POR FRANJA HORARIA (DERECHA) */}
          <Card className="p-8 bg-white rounded-2xl shadow-md border-0">
            <h3 className="text-xl font-bold mb-6 text-gray-900">
              Eventos por franja horaria
            </h3>
            {eventosPorFranja.some((f) => f.eventos > 0) ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventosPorFranja} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="franja"
                      tick={{ fontSize: 13, fontWeight: 600, fill: "#374151" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => [`${value} eventos`, ""]}
                    />
                    <Bar 
                      dataKey="eventos" 
                      radius={[8, 8, 0, 0]}
                      barSize={60}
                    >
                      {eventosPorFranja.map((entry, index) => (
                        <Cell key={index} fill={getBarColor(entry.franja)} />
                      ))}
                      <LabelList 
                        dataKey="eventos" 
                        position="top" 
                        formatter={(value: number) => value}
                        style={{ fontSize: 12, fontWeight: 600, fill: "#374151" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-sm text-gray-500">No hay datos para mostrar</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
