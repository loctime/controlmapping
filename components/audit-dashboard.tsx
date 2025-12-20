"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, FileCheck, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import type { AuditFile } from "@/parsers/auditParser"
import { normalizeDate } from "@/utils/date"

interface AuditDashboardProps {
  auditFiles: AuditFile[]
}

/**
 * Helpers para obtener métricas oficiales desde headers
 * REGLA: Solo usar valores desde audit.headers (mapeados desde Excel)
 */

/**
 * Obtiene el porcentaje de cumplimiento oficial desde headers
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
 * Obtiene un valor numérico desde headers
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

export function AuditDashboard({ auditFiles }: AuditDashboardProps) {
  // Detectar disponibilidad de datos desde headers
  const dataAvailability = useMemo(() => {
    if (auditFiles.length === 0) {
      return {
        hasBreakdowns: false,
        hasCumplimientoPct: false,
        hasFechas: false,
        hasOperaciones: false,
        hasItems: false,
      }
    }

    let hasBreakdowns = false
    let hasCumplimientoPct = false
    let hasFechas = false
    let hasOperaciones = false
    let hasItems = false

    auditFiles.forEach((file) => {
      // Verificar breakdowns (cantidad_cumple, cantidad_no_cumple, etc.)
      const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
      const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
      if (cumple !== null || noCumple !== null) {
        hasBreakdowns = true
      }

      // Verificar porcentaje de cumplimiento
      if (getCumplimientoPct(file.headers) !== null) {
        hasCumplimientoPct = true
      }

      // Verificar fechas
      if (normalizeDate(file.headers.fecha)) {
        hasFechas = true
      }

      // Verificar operaciones
      if (file.headers.operacion) {
        hasOperaciones = true
      }

      // Verificar items
      if (getHeaderNumber(file.headers, "cantidad_items") !== null) {
        hasItems = true
      }
    })

    return {
      hasBreakdowns,
      hasCumplimientoPct,
      hasFechas,
      hasOperaciones,
      hasItems,
    }
  }, [auditFiles])

  // KPIs globales
  const kpis = useMemo(() => {
    if (auditFiles.length === 0) {
      return {
        totalAuditorias: 0,
        totalItems: 0,
        cumplimientoPromedio: 0,
        totalIncumplimientos: 0,
      }
    }

    const totalAuditorias = auditFiles.length
    
    // Solo usar valores oficiales desde headers
    const totalItems = auditFiles.reduce((sum, file) => {
      const items = getHeaderNumber(file.headers, "cantidad_items")
      return sum + (items ?? 0)
    }, 0)
    
    const cumplimientos = auditFiles
      .map((file) => getCumplimientoPct(file.headers))
      .filter((val): val is number => val !== null && val > 0)
    
    const cumplimientoPromedio =
      cumplimientos.length > 0
        ? cumplimientos.reduce((sum, val) => sum + val, 0) / cumplimientos.length
        : 0

    const totalIncumplimientos = auditFiles.reduce((sum, file) => {
      const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
      return sum + (noCumple ?? 0)
    }, 0)

    return {
      totalAuditorias,
      totalItems,
      cumplimientoPromedio: Math.round(cumplimientoPromedio * 100) / 100,
      totalIncumplimientos,
    }
  }, [auditFiles])

  // Distribución de cumplimiento
  const distribucionCumplimiento = useMemo(() => {
    const distribucion = {
      cumple: 0,
      cumple_parcial: 0,
      no_cumple: 0,
      no_aplica: 0,
    }

    auditFiles.forEach((file) => {
      const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
      const cumpleParcial = getHeaderNumber(file.headers, "cantidad_cumple_parcial")
      const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
      const noAplica = getHeaderNumber(file.headers, "cantidad_no_aplica")
      
      if (cumple !== null) distribucion.cumple += cumple
      if (cumpleParcial !== null) distribucion.cumple_parcial += cumpleParcial
      if (noCumple !== null) distribucion.no_cumple += noCumple
      if (noAplica !== null) distribucion.no_aplica += noAplica
    })

    return [
      { name: "Cumple", value: distribucion.cumple, color: "#22c55e" }, // Verde
      { name: "Cumple Parcial", value: distribucion.cumple_parcial, color: "#eab308" }, // Amarillo
      { name: "No Cumple", value: distribucion.no_cumple, color: "#ef4444" }, // Rojo
      { name: "No Aplica", value: distribucion.no_aplica, color: "#6b7280" }, // Gris
    ].filter((item) => item.value > 0)
  }, [auditFiles])

  // Cumplimiento por Auditoría (barra apilada)
  const cumplimientoPorAuditoria = useMemo(() => {
    const datos: Array<{
      auditoria: string
      cumple: number
      cumple_parcial: number
      no_cumple: number
      no_aplica: number
    }> = []

    auditFiles.forEach((file) => {
      // Leer valores desde headers (OBLIGATORIO: solo desde headers)
      const cumple = getHeaderNumber(file.headers, "cantidad_cumple")
      const cumpleParcial = getHeaderNumber(file.headers, "cantidad_cumple_parcial")
      const noCumple = getHeaderNumber(file.headers, "cantidad_no_cumple")
      const noAplica = getHeaderNumber(file.headers, "cantidad_no_aplica")

      // Solo incluir si tiene todos los campos de breakdown
      if (
        cumple !== null &&
        cumpleParcial !== null &&
        noCumple !== null &&
        noAplica !== null
      ) {
        // Usar operacion si existe, sino fileName truncado
        const auditoriaLabel = file.headers.operacion
          ? String(file.headers.operacion).substring(0, 30)
          : file.fileName.length > 30
            ? `${file.fileName.substring(0, 27)}...`
            : file.fileName

        datos.push({
          auditoria: auditoriaLabel,
          cumple: cumple,
          cumple_parcial: cumpleParcial,
          no_cumple: noCumple,
          no_aplica: noAplica,
        })
      }
    })

    return datos
  }, [auditFiles])

  // Tendencia mensual de cumplimiento
  const tendenciaMensual = useMemo(() => {
    const mesesMap = new Map<string, { cumplimientos: number[]; count: number }>()

    auditFiles.forEach((file) => {
      const fecha = normalizeDate(file.headers.fecha)
      if (!fecha) return

      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
      const cumplimiento = getCumplimientoPct(file.headers)
      if (cumplimiento === null) return

      if (!mesesMap.has(mesKey)) {
        mesesMap.set(mesKey, { cumplimientos: [], count: 0 })
      }

      const mesData = mesesMap.get(mesKey)!
      mesData.cumplimientos.push(cumplimiento)
      mesData.count++
    })

    const tendencia = Array.from(mesesMap.entries())
      .map(([mes, data]) => {
        const promedio =
          data.cumplimientos.length > 0
            ? data.cumplimientos.reduce((sum, val) => sum + val, 0) / data.cumplimientos.length
            : 0

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
  }, [auditFiles])

  // Ranking de operaciones (Top 10 por % cumplimiento)
  const rankingOperaciones = useMemo(() => {
    const operacionesMap = new Map<string, { cumplimiento: number; count: number }>()

    auditFiles.forEach((file) => {
      const operacion = file.headers.operacion
      if (!operacion) return

      const cumplimiento = getCumplimientoPct(file.headers)
      if (cumplimiento === null) return

      if (!operacionesMap.has(String(operacion))) {
        operacionesMap.set(String(operacion), { cumplimiento: 0, count: 0 })
      }

      const opData = operacionesMap.get(String(operacion))!
      opData.cumplimiento += cumplimiento
      opData.count++
    })

    const ranking = Array.from(operacionesMap.entries())
      .map(([operacion, data]) => ({
        operacion: String(operacion).substring(0, 30),
        cumplimiento:
          data.count > 0 ? Math.round((data.cumplimiento / data.count) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.cumplimiento - a.cumplimiento)
      .slice(0, 10)

    return ranking
  }, [auditFiles])

  const chartConfig = {
    cumplimiento: {
      label: "% Cumplimiento",
      color: "#3b82f6", // Azul
    },
  }

  // Función para obtener color según porcentaje de cumplimiento
  const getCumplimientoColor = (porcentaje: number): string => {
    if (porcentaje >= 90) return "#22c55e" // Verde
    if (porcentaje >= 70) return "#eab308" // Amarillo
    if (porcentaje >= 50) return "#f97316" // Naranja
    return "#ef4444" // Rojo
  }

  if (auditFiles.length === 0) {
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
      {/* Alerta informativa sobre datos faltantes */}
      {(!dataAvailability.hasBreakdowns || !dataAvailability.hasCumplimientoPct || !dataAvailability.hasFechas) && (
        <Alert variant="default" className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Información sobre los datos:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
              {!dataAvailability.hasBreakdowns && (
                <li>Los archivos Excel no incluyen desglose de cumplimiento (cumple/no cumple/no aplica). Algunos gráficos pueden estar vacíos.</li>
              )}
              {!dataAvailability.hasCumplimientoPct && (
                <li>No se encontró porcentaje de cumplimiento en los headers. Los gráficos de tendencia y ranking no se mostrarán.</li>
              )}
              {!dataAvailability.hasFechas && (
                <li>No se encontraron fechas válidas. El gráfico de tendencia mensual no se mostrará.</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Ítems Evaluados</p>
                {!dataAvailability.hasItems && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este valor proviene de los headers del Excel.</p>
                      <p>Si está en 0, el Excel no incluye este campo.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">{kpis.totalItems.toLocaleString()}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">% Cumplimiento Promedio</p>
                {!dataAvailability.hasCumplimientoPct && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este valor proviene de los headers del Excel.</p>
                      <p>Si está en 0%, el Excel no incluye porcentaje de cumplimiento.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-3xl font-bold text-foreground mt-2">
                {kpis.cumplimientoPromedio.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Total de Incumplimientos</p>
                {!dataAvailability.hasBreakdowns && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este valor proviene de los headers del Excel.</p>
                      <p>Si está en 0, el Excel no incluye desglose de incumplimientos.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
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
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Distribución de Cumplimiento</Label>
                {!dataAvailability.hasBreakdowns && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este gráfico requiere datos de breakdown desde los headers del Excel.</p>
                      <p>Campos necesarios: cantidad_cumple, cantidad_no_cumple, etc.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
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
                    innerRadius={0}
                    dataKey="value"
                  >
                    {distribucionCumplimiento.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={2} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No hay datos de distribución disponibles
                </p>
                {!dataAvailability.hasBreakdowns && (
                  <p className="text-xs text-muted-foreground/70">
                    Los archivos Excel procesados no incluyen desglose de cumplimiento en los headers.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Tendencia mensual */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Tendencia Mensual de Cumplimiento</Label>
                {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasFechas) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este gráfico requiere:</p>
                      <ul className="list-disc ml-4 mt-1">
                        <li>Porcentaje de cumplimiento en headers</li>
                        <li>Fechas válidas en headers</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Promedio de cumplimiento por mes
              </p>
            </div>
            {tendenciaMensual.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={tendenciaMensual}>
                  <defs>
                    <linearGradient id="colorCumplimiento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
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
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No hay datos de tendencia disponibles
                </p>
                {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasFechas) && (
                  <p className="text-xs text-muted-foreground/70">
                    {!dataAvailability.hasCumplimientoPct && !dataAvailability.hasFechas
                      ? "Faltan porcentajes de cumplimiento y fechas en los headers."
                      : !dataAvailability.hasCumplimientoPct
                        ? "Faltan porcentajes de cumplimiento en los headers."
                        : "Faltan fechas válidas en los headers."}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cumplimiento por Auditoría (barra apilada) */}
      <Card className="p-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-lg font-semibold">Cumplimiento por Auditoría</Label>
                {!dataAvailability.hasBreakdowns && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Este gráfico requiere datos de breakdown desde los headers del Excel.</p>
                      <p>Campos necesarios: cantidad_cumple, cantidad_cumple_parcial, cantidad_no_cumple, cantidad_no_aplica</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Distribución de cumplimiento por auditoría (solo auditorías con breakdown completo)
              </p>
            </div>
            {cumplimientoPorAuditoria.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart
                  data={cumplimientoPorAuditoria}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    <linearGradient id="barCumple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="barCumpleParcial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#ca8a04" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="barNoCumple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="barNoAplica" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7280" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#4b5563" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="auditoria"
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    label={{ value: "Cantidad de ítems", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fill: "#6b7280" } }}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null
                      
                      const data = payload[0].payload
                      const total = data.cumple + data.cumple_parcial + data.no_cumple + data.no_aplica
                      
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <p className="font-semibold mb-2">{data.auditoria}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }} />
                                <span>Cumple:</span>
                              </div>
                              <span className="font-medium">{data.cumple}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#eab308" }} />
                                <span>Cumple Parcial:</span>
                              </div>
                              <span className="font-medium">{data.cumple_parcial}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }} />
                                <span>No Cumple:</span>
                              </div>
                              <span className="font-medium">{data.no_cumple}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: "#6b7280" }} />
                                <span>No Aplica:</span>
                              </div>
                              <span className="font-medium">{data.no_aplica}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t">
                              <div className="flex items-center justify-between gap-4">
                                <span className="font-semibold">Total:</span>
                                <span className="font-bold">{total}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                    cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="rect"
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        cumple: "Cumple",
                        cumple_parcial: "Cumple Parcial",
                        no_cumple: "No Cumple",
                        no_aplica: "No Aplica",
                      }
                      return labels[value] || value
                    }}
                  />
                  <Bar
                    dataKey="cumple"
                    stackId="a"
                    fill="#22c55e"
                    name="cumple"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="cumple_parcial"
                    stackId="a"
                    fill="#eab308"
                    name="cumple_parcial"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="no_cumple"
                    stackId="a"
                    fill="#ef4444"
                    name="no_cumple"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="no_aplica"
                    stackId="a"
                    fill="#6b7280"
                    name="no_aplica"
                    radius={[0, 0, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No hay datos disponibles
                </p>
                {!dataAvailability.hasBreakdowns && (
                  <p className="text-xs text-muted-foreground/70">
                    Los archivos Excel procesados no incluyen desglose completo de cumplimiento en los headers.
                    Se requieren todos los campos: cantidad_cumple, cantidad_cumple_parcial, cantidad_no_cumple, cantidad_no_aplica
                  </p>
                )}
                {dataAvailability.hasBreakdowns && cumplimientoPorAuditoria.length === 0 && (
                  <p className="text-xs text-muted-foreground/70">
                    Ninguna auditoría tiene todos los campos de breakdown requeridos.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

      {/* Ranking de operaciones */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-lg font-semibold">Ranking de Operaciones</Label>
              {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasOperaciones) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Este gráfico requiere:</p>
                    <ul className="list-disc ml-4 mt-1">
                      <li>Porcentaje de cumplimiento en headers</li>
                      <li>Campo "operacion" en headers</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Top 10 operaciones por % de cumplimiento
            </p>
          </div>
          {rankingOperaciones.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px]">
              <BarChart data={rankingOperaciones} layout="vertical">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                    <stop offset="50%" stopColor="#eab308" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                />
                <YAxis 
                  dataKey="operacion" 
                  type="category" 
                  width={150}
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar 
                  dataKey="cumplimiento" 
                  radius={[0, 8, 8, 0]}
                >
                  {rankingOperaciones.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCumplimientoColor(entry.cumplimiento)} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                No hay datos de ranking disponibles
              </p>
              {(!dataAvailability.hasCumplimientoPct || !dataAvailability.hasOperaciones) && (
                <p className="text-xs text-muted-foreground/70">
                  {!dataAvailability.hasCumplimientoPct && !dataAvailability.hasOperaciones
                    ? "Faltan porcentajes de cumplimiento y operaciones en los headers."
                    : !dataAvailability.hasCumplimientoPct
                      ? "Faltan porcentajes de cumplimiento en los headers."
                      : "Faltan operaciones en los headers."}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

