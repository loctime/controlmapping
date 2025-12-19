"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { Label } from "@/components/ui/label"
import { TrendingUp, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react"

interface ProcessedResult {
  fileName: string
  headers: Record<string, string | number>
  rows: Array<Record<string, string | number>>
  calculated: {
    fecha: Date | null
    totalItems: number
    cumple: number
    cumple_parcial: number
    no_cumple: number
    no_aplica: number
    porcentajeCumplimiento: number
  }
}

interface DashboardGeneralProps {
  results: ProcessedResult[]
}

export function DashboardGeneral({ results }: DashboardGeneralProps) {
  // Calcular KPIs globales usando valores calculados
  const kpis = useMemo(() => {
    if (results.length === 0) {
      return {
        totalAuditorias: 0,
        totalItems: 0,
        cumplimientoPromedio: 0,
        totalIncumplimientos: 0,
      }
    }

    // Total de auditorías
    const totalAuditorias = results.length

    // Total de ítems evaluados (suma de totalItems calculados)
    const totalItems = results.reduce((sum, result) => {
      return sum + result.calculated.totalItems
    }, 0)

    // % cumplimiento promedio (promedio de porcentajeCumplimiento calculado)
    const cumplimientos = results
      .map((result) => result.calculated.porcentajeCumplimiento)
      .filter((val) => val > 0)

    const cumplimientoPromedio =
      cumplimientos.length > 0
        ? cumplimientos.reduce((sum, val) => sum + val, 0) / cumplimientos.length
        : 0

    // Total de incumplimientos (suma de no_cumple calculados)
    const totalIncumplimientos = results.reduce((sum, result) => {
      return sum + result.calculated.no_cumple
    }, 0)

    return {
      totalAuditorias,
      totalItems,
      cumplimientoPromedio: Math.round(cumplimientoPromedio * 100) / 100,
      totalIncumplimientos,
    }
  }, [results])

  // Distribución de cumplimiento usando valores calculados
  const distribucionCumplimiento = useMemo(() => {
    const distribucion = {
      cumple: 0,
      cumple_parcial: 0,
      no_cumple: 0,
      no_aplica: 0,
    }

    results.forEach((result) => {
      distribucion.cumple += result.calculated.cumple
      distribucion.cumple_parcial += result.calculated.cumple_parcial
      distribucion.no_cumple += result.calculated.no_cumple
      distribucion.no_aplica += result.calculated.no_aplica
    })

    return [
      { name: "Cumple", value: distribucion.cumple, color: "hsl(var(--chart-1))" },
      { name: "Cumple Parcial", value: distribucion.cumple_parcial, color: "hsl(var(--chart-2))" },
      { name: "No Cumple", value: distribucion.no_cumple, color: "hsl(var(--chart-3))" },
      { name: "No Aplica", value: distribucion.no_aplica, color: "hsl(var(--chart-4))" },
    ].filter((item) => item.value > 0)
  }, [results])

  // Tendencia mensual de cumplimiento usando fecha y porcentaje calculados
  const tendenciaMensual = useMemo(() => {
    const mesesMap = new Map<string, { cumplimientos: number[]; count: number }>()

    results.forEach((result) => {
      const fecha = result.calculated.fecha
      if (!fecha) return

      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
      const cumplimiento = result.calculated.porcentajeCumplimiento

      if (!mesesMap.has(mesKey)) {
        mesesMap.set(mesKey, { cumplimientos: [], count: 0 })
      }

      const mesData = mesesMap.get(mesKey)!
      mesData.cumplimientos.push(cumplimiento)
      mesData.count++
    })

    // Convertir a array y calcular promedios
    const tendencia = Array.from(mesesMap.entries())
      .map(([mes, data]) => {
        const promedio =
          data.cumplimientos.length > 0
            ? data.cumplimientos.reduce((sum, val) => sum + val, 0) / data.cumplimientos.length
            : 0

        // Formatear el mes para mostrar
        const [year, month] = mes.split("-")
        const monthNames = [
          "Ene",
          "Feb",
          "Mar",
          "Abr",
          "May",
          "Jun",
          "Jul",
          "Ago",
          "Sep",
          "Oct",
          "Nov",
          "Dic",
        ]
        const monthLabel = `${monthNames[parseInt(month) - 1]} ${year}`

        return {
          mes: monthLabel,
          cumplimiento: Math.round(promedio * 100) / 100,
          cantidad: data.count,
        }
      })
      .sort((a, b) => {
        // Ordenar por fecha
        const [mesA, yearA] = a.mes.split(" ")
        const [mesB, yearB] = b.mes.split(" ")
        const monthNames = [
          "Ene",
          "Feb",
          "Mar",
          "Abr",
          "May",
          "Jun",
          "Jul",
          "Ago",
          "Sep",
          "Oct",
          "Nov",
          "Dic",
        ]
        const monthIndexA = monthNames.indexOf(mesA)
        const monthIndexB = monthNames.indexOf(mesB)
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB)
        return monthIndexA - monthIndexB
      })

    return tendencia
  }, [results])

  // Ranking de operaciones (Top 10 por % cumplimiento) usando valores calculados
  const rankingOperaciones = useMemo(() => {
    const operacionesMap = new Map<string, { cumplimiento: number; count: number }>()

    results.forEach((result) => {
      const operacion = result.headers.operacion
      if (!operacion) return

      const cumplimiento = result.calculated.porcentajeCumplimiento

      if (!operacionesMap.has(String(operacion))) {
        operacionesMap.set(String(operacion), { cumplimiento: 0, count: 0 })
      }

      const opData = operacionesMap.get(String(operacion))!
      opData.cumplimiento += cumplimiento
      opData.count++
    })

    // Calcular promedio por operación y ordenar
    const ranking = Array.from(operacionesMap.entries())
      .map(([operacion, data]) => ({
        operacion: String(operacion).substring(0, 30), // Limitar longitud
        cumplimiento:
          data.count > 0 ? Math.round((data.cumplimiento / data.count) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.cumplimiento - a.cumplimiento)
      .slice(0, 10)

    return ranking
  }, [results])

  const chartConfig = {
    cumplimiento: {
      label: "% Cumplimiento",
      color: "hsl(var(--chart-1))",
    },
  }

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ]

  if (results.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">
          No hay datos para mostrar el dashboard. Procesá los archivos primero.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Auditorías</p>
              <p className="text-3xl font-bold text-foreground mt-2">{kpis.totalAuditorias}</p>
            </div>
            <FileCheck className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Ítems Evaluados</p>
              <p className="text-3xl font-bold text-foreground mt-2">{kpis.totalItems.toLocaleString()}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">% Cumplimiento Promedio</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {kpis.cumplimientoPromedio.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Incumplimientos</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {kpis.totalIncumplimientos.toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribución de cumplimiento */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">Distribución de Cumplimiento</Label>
              <p className="text-sm text-muted-foreground">
                Distribución de ítems por estado de cumplimiento
              </p>
            </div>
            {distribucionCumplimiento.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={distribucionCumplimiento}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distribucionCumplimiento.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay datos de distribución disponibles
              </p>
            )}
          </div>
        </Card>

        {/* Tendencia mensual */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">Tendencia Mensual de Cumplimiento</Label>
              <p className="text-sm text-muted-foreground">
                Promedio de cumplimiento por mes
              </p>
            </div>
            {tendenciaMensual.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={tendenciaMensual}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="cumplimiento"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay datos de tendencia disponibles
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Ranking de operaciones */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label className="text-lg font-semibold">Ranking de Operaciones</Label>
            <p className="text-sm text-muted-foreground">
              Top 10 operaciones por % de cumplimiento
            </p>
          </div>
          {rankingOperaciones.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px]">
              <BarChart data={rankingOperaciones} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="operacion" type="category" width={150} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cumplimiento" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay datos de ranking disponibles
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}

