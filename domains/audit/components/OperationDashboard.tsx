"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, FileCheck, AlertTriangle, CheckCircle2, Info, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AuditFile } from "@/domains/audit"
import { useAuditMetrics } from "@/domains/audit/hooks/useAuditMetrics"
import { normalizeDate } from "@/utils/date"
import Link from "next/link"

interface OperationDashboardProps {
  auditFiles: AuditFile[]
  operationId: string
  hideNavigation?: boolean // Para ocultar breadcrumbs y botón volver cuando se usa en tabs
}

/**
 * Helper para obtener el porcentaje de cumplimiento desde headers
 */
function getCumplimientoPct(headers: AuditFile["headers"]): number | null {
  const value =
    headers.cumplimiento_total_pct ?? headers.porcentaje_cumplimiento ?? null

  if (value === null || value === undefined) return null

  if (typeof value === "number") return value
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/%/g, "").replace(/,/g, ".").trim())
    return isNaN(num) ? null : num
  }

  return null
}

/**
 * Helper para obtener un valor numérico desde headers
 */
function getHeaderNumber(
  headers: AuditFile["headers"],
  key: string
): number | null {
  const value = headers[key]
  if (value === null || value === undefined) return null

  if (typeof value === "number") return value
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/,/g, ".").trim())
    return isNaN(num) ? null : num
  }

  return null
}

export function OperationDashboard({
  auditFiles,
  operationId,
  hideNavigation = false,
}: OperationDashboardProps) {
  const router = useRouter()

  // Filtrar auditorías de esta operación
  const operationAudits = useMemo(() => {
    return auditFiles.filter((audit) => {
      const operacion = String(audit.headers.operacion || "").trim()
      return operacion === operationId
    })
  }, [auditFiles, operationId])

  // Calcular métricas usando el hook
  const metrics = useAuditMetrics(auditFiles, { operationId })

  // Obtener nombre de la operación
  const operationName = useMemo(() => {
    if (operationAudits.length > 0) {
      return String(operationAudits[0].headers.operacion || operationId)
    }
    return operationId
  }, [operationAudits, operationId])

  // Calcular variación vs período anterior
  const variacion = useMemo(() => {
    if (metrics.monthlyTrend.length < 2) return null

    const ultimo = metrics.monthlyTrend[metrics.monthlyTrend.length - 1]
    const anterior = metrics.monthlyTrend[metrics.monthlyTrend.length - 2]

    return ultimo.cumplimiento - anterior.cumplimiento
  }, [metrics.monthlyTrend])

  // Top 10 ítems más incumplidos (por frecuencia)
  const topItemsIncumplidos = useMemo(() => {
    const itemsMap = new Map<string, number>()

    operationAudits.forEach((audit) => {
      audit.items.forEach((item) => {
        if (item.estado === "no_cumple") {
          const count = itemsMap.get(item.pregunta) || 0
          itemsMap.set(item.pregunta, count + 1)
        }
      })
    })

    return Array.from(itemsMap.entries())
      .map(([pregunta, frecuencia]) => ({ pregunta, frecuencia }))
      .sort((a, b) => b.frecuencia - a.frecuencia)
      .slice(0, 10)
  }, [operationAudits])

  // Ranking interno de operarios (si existe campo)
  const rankingOperarios = useMemo(() => {
    const operariosMap = new Map<
      string,
      { cumplimiento: number; count: number }
    >()

    operationAudits.forEach((audit) => {
      const operario =
        audit.headers.operario ||
        audit.headers.auditor ||
        audit.headers.responsable ||
        null

      if (!operario) return

      const cumplimiento = getCumplimientoPct(audit.headers)
      if (cumplimiento === null) return

      const operarioKey = String(operario).trim()
      if (!operariosMap.has(operarioKey)) {
        operariosMap.set(operarioKey, { cumplimiento: 0, count: 0 })
      }

      const opData = operariosMap.get(operarioKey)!
      opData.cumplimiento += cumplimiento
      opData.count++
    })

    return Array.from(operariosMap.entries())
      .map(([operario, data]) => ({
        operario: operario.substring(0, 30),
        cumplimiento:
          data.count > 0
            ? Math.round((data.cumplimiento / data.count) * 100) / 100
            : 0,
        cantidad: data.count,
      }))
      .sort((a, b) => b.cumplimiento - a.cumplimiento)
      .slice(0, 10)
  }, [operationAudits])

  // Fecha última auditoría
  const fechaUltimaAuditoria = useMemo(() => {
    if (!metrics.ultimaAuditoria) return null
    return normalizeDate(metrics.ultimaAuditoria.headers.fecha)
  }, [metrics.ultimaAuditoria])

  // Función para obtener color según porcentaje de cumplimiento
  const getCumplimientoColor = (porcentaje: number): string => {
    if (porcentaje >= 90) return "#22c55e"
    if (porcentaje >= 70) return "#eab308"
    if (porcentaje >= 50) return "#f97316"
    return "#ef4444"
  }

  if (operationAudits.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h2 className="text-xl font-semibold">Operación: {operationName}</h2>
              <p className="text-sm text-muted-foreground">
                No se encontraron auditorías para esta operación
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs y botón volver - solo si no está en modo tabs */}
      {!hideNavigation && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/process" className="hover:text-foreground">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground">Operación: {operationName}</span>
          </div>
          <Card className="p-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Dashboard General
            </Button>
          </Card>
        </>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                % Cumplimiento Total
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {metrics.compliance.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Variación vs Período Anterior
              </p>
              <p
                className={`text-3xl font-bold mt-2 ${
                  variacion !== null
                    ? variacion >= 0
                      ? "text-green-600"
                      : "text-red-600"
                    : "text-foreground"
                }`}
              >
                {variacion !== null
                  ? `${variacion >= 0 ? "+" : ""}${variacion.toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Auditorías
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {metrics.kpis.totalAuditorias}
              </p>
            </div>
            <FileCheck className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Incumplimientos Activos
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {metrics.kpis.totalIncumplimientos.toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Fecha última auditoría */}
      {fechaUltimaAuditoria && (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Última auditoría:{" "}
              <span className="font-medium text-foreground">
                {fechaUltimaAuditoria.toLocaleDateString("es-AR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
          </div>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tendencia mensual */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">
                Tendencia Mensual de Cumplimiento
              </Label>
              <p className="text-sm text-muted-foreground">
                Evolución del cumplimiento por mes
              </p>
            </div>
            {metrics.monthlyTrend.length > 0 ? (
              <ChartContainer
                config={{
                  cumplimiento: {
                    label: "% Cumplimiento",
                    color: "#3b82f6",
                  },
                }}
                className="h-[300px]"
              >
                <LineChart data={metrics.monthlyTrend}>
                  <defs>
                    <linearGradient
                      id="colorCumplimiento"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="mes"
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    cursor={{ stroke: "#3b82f6", strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumplimiento"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, fill: "#2563eb" }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No hay datos de tendencia disponibles
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Distribución de cumplimiento */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">
                Distribución de Cumplimiento
              </Label>
              <p className="text-sm text-muted-foreground">
                Distribución de ítems por estado
              </p>
            </div>
            {metrics.distribution.length > 0 ? (
              <ChartContainer
                config={{
                  cumplimiento: {
                    label: "% Cumplimiento",
                    color: "#3b82f6",
                  },
                }}
                className="h-[300px]"
              >
                <PieChart>
                  <Pie
                    data={metrics.distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    innerRadius={0}
                    dataKey="value"
                  >
                    {metrics.distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={entry.color}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No hay datos de distribución disponibles
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top 10 ítems más incumplidos */}
      {topItemsIncumplidos.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">
                Top 10 Ítems Más Incumplidos
              </Label>
              <p className="text-sm text-muted-foreground">
                Por frecuencia de incumplimiento
              </p>
            </div>
            <ChartContainer
              config={{
                frecuencia: {
                  label: "Frecuencia",
                  color: "#ef4444",
                },
              }}
              className="h-[400px]"
            >
              <BarChart data={topItemsIncumplidos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis
                  dataKey="pregunta"
                  type="category"
                  width={200}
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "rgba(239, 68, 68, 0.1)" }}
                />
                <Bar dataKey="frecuencia" fill="#ef4444" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </Card>
      )}

      {/* Ranking interno de operarios */}
      {rankingOperarios.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">
                Ranking Interno de Operarios
              </Label>
              <p className="text-sm text-muted-foreground">
                Top 10 operarios por % de cumplimiento en esta operación
              </p>
            </div>
            <ChartContainer
              config={{
                cumplimiento: {
                  label: "% Cumplimiento",
                  color: "#3b82f6",
                },
              }}
              className="h-[400px]"
            >
              <BarChart data={rankingOperarios} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis
                  dataKey="operario"
                  type="category"
                  width={150}
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar dataKey="cumplimiento" radius={[0, 8, 8, 0]}>
                  {rankingOperarios.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getCumplimientoColor(entry.cumplimiento)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </Card>
      )}

      {/* Tabla de auditorías */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label className="text-lg font-semibold">
              Auditorías de esta Operación
            </Label>
            <p className="text-sm text-muted-foreground">
              Listado completo de auditorías realizadas
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Archivo</th>
                  <th className="text-left p-2 font-medium">Fecha</th>
                  <th className="text-right p-2 font-medium">% Cumplimiento</th>
                  <th className="text-right p-2 font-medium">Total Ítems</th>
                  <th className="text-right p-2 font-medium">Incumplimientos</th>
                </tr>
              </thead>
              <tbody>
                {operationAudits.map((audit, idx) => {
                  const fecha = normalizeDate(audit.headers.fecha)
                  const cumplimiento = getCumplimientoPct(audit.headers)

                  return (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{audit.fileName}</td>
                      <td className="p-2">
                        {fecha
                          ? fecha.toLocaleDateString("es-AR")
                          : "Sin fecha"}
                      </td>
                      <td className="p-2 text-right">
                        {cumplimiento !== null
                          ? `${cumplimiento.toFixed(1)}%`
                          : "N/A"}
                      </td>
                      <td className="p-2 text-right">
                        {audit.totals.totalItems}
                      </td>
                      <td className="p-2 text-right">
                        {audit.totals.no_cumple}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}
