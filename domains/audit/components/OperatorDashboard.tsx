"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, FileCheck, AlertTriangle, CheckCircle2, Info, ArrowLeft, User, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { AuditFile } from "@/domains/audit"
import { useAuditMetrics } from "@/domains/audit/hooks/useAuditMetrics"
import { normalizeDate } from "@/utils/date"
import Link from "next/link"

interface OperatorDashboardProps {
  auditFiles: AuditFile[]
  operatorId: string
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

export function OperatorDashboard({
  auditFiles,
  operatorId,
  hideNavigation = false,
}: OperatorDashboardProps) {
  const router = useRouter()

  // Filtrar auditorías de este operario
  const operatorAudits = useMemo(() => {
    return auditFiles.filter((audit) => {
      const operario =
        audit.headers.operario ||
        audit.headers.auditor ||
        audit.headers.responsable ||
        null

      if (!operario) return false
      return String(operario).trim() === operatorId
    })
  }, [auditFiles, operatorId])

  // Calcular métricas usando el hook
  const metrics = useAuditMetrics(auditFiles, { operatorId })

  // Obtener nombre del operario
  const operatorName = useMemo(() => {
    if (operatorAudits.length > 0) {
      const operario =
        operatorAudits[0].headers.operario ||
        operatorAudits[0].headers.auditor ||
        operatorAudits[0].headers.responsable ||
        null
      return operario ? String(operario) : operatorId
    }
    return operatorId
  }, [operatorAudits, operatorId])

  // Calcular cumplimiento promedio de la operación para comparativa
  const comparativaOperacion = useMemo(() => {
    // Obtener operaciones únicas donde participó este operario
    const operaciones = new Set<string>()
    operatorAudits.forEach((audit) => {
      const operacion = audit.headers.operacion
      if (operacion) operaciones.add(String(operacion))
    })

    // Calcular promedio de cumplimiento por operación manualmente
    const promediosPorOperacion: number[] = []
    operaciones.forEach((operacionId) => {
      // Filtrar auditorías de esta operación
      const operacionAudits = auditFiles.filter((audit) => {
        const operacion = String(audit.headers.operacion || "").trim()
        return operacion === operacionId
      })

      if (operacionAudits.length === 0) return

      // Calcular cumplimiento promedio
      const cumplimientos = operacionAudits
        .map((audit) => {
          const value =
            audit.headers.cumplimiento_total_pct ??
            audit.headers.porcentaje_cumplimiento ??
            null

          if (value === null || value === undefined) return null

          if (typeof value === "number") return value
          if (typeof value === "string") {
            const num = parseFloat(value.replace(/%/g, "").replace(/,/g, ".").trim())
            return isNaN(num) ? null : num
          }

          return null
        })
        .filter((val): val is number => val !== null && val > 0)

      if (cumplimientos.length > 0) {
        const promedio =
          cumplimientos.reduce((sum, val) => sum + val, 0) / cumplimientos.length
        promediosPorOperacion.push(promedio)
      }
    })

    if (promediosPorOperacion.length === 0) return null

    const promedio =
      promediosPorOperacion.reduce((sum, val) => sum + val, 0) /
      promediosPorOperacion.length

    return Math.round(promedio * 100) / 100
  }, [operatorAudits, auditFiles])

  // Evolución temporal del cumplimiento
  const evolucionTemporal = useMemo(() => {
    const auditoriasConFecha = operatorAudits
      .map((audit) => ({
        audit,
        fecha: normalizeDate(audit.headers.fecha),
        cumplimiento: getCumplimientoPct(audit.headers),
      }))
      .filter(
        (item): item is {
          audit: AuditFile
          fecha: Date
          cumplimiento: number
        } => item.fecha !== null && item.cumplimiento !== null
      )
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

    return auditoriasConFecha.map((item) => ({
      fecha: item.fecha.toLocaleDateString("es-AR", {
        month: "short",
        day: "numeric",
      }),
      cumplimiento: item.cumplimiento,
    }))
  }, [operatorAudits])

  // Ítems más observados en este operario
  const itemsObservados = useMemo(() => {
    const itemsMap = new Map<
      string,
      {
        noCumple: number
        cumpleParcial: number
        total: number
      }
    >()

    operatorAudits.forEach((audit) => {
      audit.items.forEach((item) => {
        const current = itemsMap.get(item.pregunta) || {
          noCumple: 0,
          cumpleParcial: 0,
          total: 0,
        }

        if (item.estado === "no_cumple") {
          current.noCumple++
        } else if (item.estado === "cumple_parcial") {
          current.cumpleParcial++
        }
        current.total++

        itemsMap.set(item.pregunta, current)
      })
    })

    return Array.from(itemsMap.entries())
      .map(([pregunta, data]) => ({
        pregunta,
        observaciones: data.noCumple + data.cumpleParcial,
        total: data.total,
      }))
      .filter((item) => item.observaciones > 0)
      .sort((a, b) => b.observaciones - a.observaciones)
      .slice(0, 10)
  }, [operatorAudits])

  // Historial cronológico de observaciones
  const historialObservaciones = useMemo(() => {
    const historial: Array<{
      fecha: Date
      auditoria: string
      items: Array<{ pregunta: string; estado: string; observaciones?: string }>
    }> = []

    operatorAudits.forEach((audit) => {
      const fecha = normalizeDate(audit.headers.fecha)
      if (!fecha) return

      const itemsObservados = audit.items.filter(
        (item) =>
          item.estado === "no_cumple" || item.estado === "cumple_parcial"
      )

      if (itemsObservados.length > 0) {
        historial.push({
          fecha,
          auditoria: audit.fileName,
          items: itemsObservados.map((item) => ({
            pregunta: item.pregunta,
            estado: item.estado,
            observaciones: item.observaciones,
          })),
        })
      }
    })

    return historial.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
  }, [operatorAudits])

  // Estado para manejar qué archivos están expandidos
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  // Función para toggle del estado de expansión de un archivo
  const toggleFile = (fileName: string) => {
    setExpandedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(fileName)) {
        newSet.delete(fileName)
      } else {
        newSet.add(fileName)
      }
      return newSet
    })
  }

  if (operatorAudits.length === 0) {
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
              <h2 className="text-xl font-semibold">Operario: {operatorName}</h2>
              <p className="text-sm text-muted-foreground">
                No se encontraron auditorías para este operario
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
            <span className="text-foreground">Operario: {operatorName}</span>
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
                % Cumplimiento Promedio
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
                Evolución Temporal
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {evolucionTemporal.length > 0
                  ? evolucionTemporal.length === 1
                    ? "1 auditoría"
                    : `${evolucionTemporal.length} auditorías`
                  : "Sin datos"}
              </p>
              {evolucionTemporal.length >= 2 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {evolucionTemporal[0].cumplimiento.toFixed(1)}% →{" "}
                  {evolucionTemporal[evolucionTemporal.length - 1].cumplimiento.toFixed(1)}%
                </p>
              )}
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Cantidad de Desvíos Detectados
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {metrics.kpis.totalIncumplimientos.toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Auditorías donde Participó
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {metrics.kpis.totalAuditorias}
              </p>
            </div>
            <FileCheck className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tendencia personal */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">
                Tendencia Personal de Cumplimiento
              </Label>
              <p className="text-sm text-muted-foreground">
                Evolución del cumplimiento a lo largo del tiempo
              </p>
            </div>
            {evolucionTemporal.length > 0 ? (
              <ChartContainer
                config={{
                  cumplimiento: {
                    label: "% Cumplimiento",
                    color: "#3b82f6",
                  },
                }}
                className="h-[300px]"
              >
                <LineChart data={evolucionTemporal}>
                  <defs>
                    <linearGradient
                      id="colorCumplimientoOp"
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
                    dataKey="fecha"
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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

      {/* Comparativa vs promedio de operación */}
      {comparativaOperacion !== null && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">
                Comparativa Contextual
              </Label>
              <p className="text-sm text-muted-foreground">
                Cumplimiento del operario vs promedio de las operaciones donde participó
              </p>
            </div>
            <ChartContainer
              config={{
                cumplimiento: {
                  label: "% Cumplimiento",
                  color: "#3b82f6",
                },
              }}
              className="h-[300px]"
            >
              <BarChart
                data={[
                  {
                    nombre: "Operario",
                    cumplimiento: metrics.compliance,
                  },
                  {
                    nombre: "Promedio Operación",
                    cumplimiento: comparativaOperacion,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="nombre"
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
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar
                  dataKey="cumplimiento"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Nota:</strong> Esta comparativa es contextual y tiene como objetivo
                proporcionar una referencia para el análisis del desempeño individual.
                No representa un ranking punitivo.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Ítems más observados */}
      {itemsObservados.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">
                Ítems Más Observados
              </Label>
              <p className="text-sm text-muted-foreground">
                Áreas de oportunidad identificadas en las auditorías
              </p>
            </div>
            <div className="space-y-2">
              {itemsObservados.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.pregunta}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.observaciones} observación{item.observaciones !== 1 ? "es" : ""} de {item.total} auditoría{item.total !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      {((item.observaciones / item.total) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tabla de auditorías */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label className="text-lg font-semibold">
              Auditorías donde Participó
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
                  <th className="text-left p-2 font-medium">Operación</th>
                  <th className="text-left p-2 font-medium">Fecha</th>
                  <th className="text-right p-2 font-medium">% Cumplimiento</th>
                  <th className="text-right p-2 font-medium">Total Ítems</th>
                  <th className="text-right p-2 font-medium">Desvíos</th>
                </tr>
              </thead>
              <tbody>
                {operatorAudits.map((audit, idx) => {
                  const fecha = normalizeDate(audit.headers.fecha)
                  const cumplimiento = getCumplimientoPct(audit.headers)
                  const operacion = audit.headers.operacion

                  return (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{audit.fileName}</td>
                      <td className="p-2">
                        {operacion ? String(operacion).substring(0, 30) : "N/A"}
                      </td>
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

      {/* Historial cronológico de observaciones */}
      {historialObservaciones.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-lg font-semibold">
                Historial Cronológico de Observaciones
              </Label>
              <p className="text-sm text-muted-foreground">
                Registro temporal de observaciones identificadas
              </p>
            </div>
            <div className="space-y-2">
              {historialObservaciones.map((item, idx) => {
                const isExpanded = expandedFiles.has(item.auditoria)
                return (
                  <Collapsible
                    key={idx}
                    open={isExpanded}
                    onOpenChange={() => toggleFile(item.auditoria)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="w-full p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-left truncate">
                                  {item.auditoria}
                                </p>
                                <p className="text-xs text-muted-foreground text-left mt-1">
                                  {item.fecha.toLocaleDateString("es-AR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                              <span className="text-xs font-medium text-orange-600 whitespace-nowrap">
                                {item.items.length} observación{item.items.length !== 1 ? "es" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
                        <div className="px-4 pb-4 pt-2 space-y-2 border-t bg-muted/20">
                          {item.items.map((itemData, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="p-3 bg-background rounded text-sm border"
                            >
                              <p className="font-medium">{itemData.pregunta}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Estado:{" "}
                                {itemData.estado === "no_cumple"
                                  ? "No Cumple"
                                  : "Cumple Parcial"}
                              </p>
                              {itemData.observaciones && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {itemData.observaciones}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
