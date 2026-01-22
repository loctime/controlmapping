"use client"

import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList } from "recharts"
import { AlertTriangle, Eye, Car, Users, Gauge, EyeOff, Activity, Download, FileImage, FileText, Loader2 } from "lucide-react"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import { countD1D3 } from "./riskModel"
import { DashboardIcon } from "./DashboardIcon"
import { KpiCard } from "./KpiCard"
import { exportDashboardPNG, exportDashboardPDF } from "./exportDashboard"

interface CriticalSecurityDashboardProps {
  eventos: VehiculoEvento[]
  hideExportButton?: boolean
  onExportFunctionsReady?: (functions: {
    exportPNG: () => Promise<void>
    exportPDF: () => Promise<void>
  }) => void
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
 * Devuelve el rango de fechas de todos los eventos D1 y D3 del operador crítico
 */
function checkCriticalAlert(eventos: VehiculoEvento[]): {
  operador: string
  fechaInicio: Date
  fechaFin: Date
  totalEventos: number
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
  }
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

/**
 * Extrae patentes únicas de eventos filtrados por tipo
 */
function extraerPatentesPorTipo(eventos: VehiculoEvento[], tipoEvento: "D1" | "D3" | "criticos"): string[] {
  const patentesSet = new Set<string>()
  
  eventos.forEach((evento) => {
    const eventoCode = evento.evento?.trim()
    const patente = evento.vehiculo?.trim()
    
    if (!patente || patente === "") return
    
    if (tipoEvento === "criticos") {
      if (eventoCode === "D1" || eventoCode === "D3") {
        patentesSet.add(patente)
      }
    } else if (eventoCode === tipoEvento) {
      patentesSet.add(patente)
    }
  })
  
  return Array.from(patentesSet)
}

/**
 * Obtiene la patente principal (la que aparece más veces)
 */
function obtenerPatentePrincipal(eventos: VehiculoEvento[]): string {
  const conteoPatentes = new Map<string, number>()
  
  eventos.forEach((evento) => {
    const patente = evento.vehiculo?.trim()
    if (patente && patente !== "") {
      conteoPatentes.set(patente, (conteoPatentes.get(patente) || 0) + 1)
    }
  })
  
  if (conteoPatentes.size === 0) return ""
  
  let patentePrincipal = ""
  let maxConteo = 0
  
  conteoPatentes.forEach((conteo, patente) => {
    if (conteo > maxConteo) {
      maxConteo = conteo
      patentePrincipal = patente
    }
  })
  
  return patentePrincipal
}

/**
 * Obtiene el operador principal (el que aparece más veces)
 */
function obtenerOperadorPrincipal(eventos: VehiculoEvento[]): string {
  const conteoOperadores = new Map<string, number>()
  
  eventos.forEach((evento) => {
    const operador = evento.operador?.trim()
    if (operador && operador !== "") {
      conteoOperadores.set(operador, (conteoOperadores.get(operador) || 0) + 1)
    }
  })
  
  if (conteoOperadores.size === 0) return ""
  
  let operadorPrincipal = ""
  let maxConteo = 0
  
  conteoOperadores.forEach((conteo, operador) => {
    if (conteo > maxConteo) {
      maxConteo = conteo
      operadorPrincipal = operador
    }
  })
  
  return operadorPrincipal
}

export function CriticalSecurityDashboard({ 
  eventos, 
  hideExportButton = false,
  onExportFunctionsReady 
}: CriticalSecurityDashboardProps) {
  const [isExporting, setIsExporting] = useState(false)

  // Verificar alerta crítica
  const criticalAlert = useMemo(() => checkCriticalAlert(eventos), [eventos])

  // Información de vehículos para el header
  const vehiculosInfo = useMemo(() => {
    const vehiculosUnicos = new Set(
      eventos
        .map((e) => e.vehiculo?.trim())
        .filter((v) => v && v !== "")
    ).size
    
    const patentePrincipal = obtenerPatentePrincipal(eventos)
    const operadorPrincipal = obtenerOperadorPrincipal(eventos)
    
    return {
      totalVehiculos: vehiculosUnicos,
      patentePrincipal,
      operadorPrincipal,
    }
  }, [eventos])

  // Patentes por tipo de evento para KPI cards (como arrays)
  const patentesPorTipo = useMemo(() => {
    return {
      criticos: extraerPatentesPorTipo(eventos, "criticos"),
      fatiga: extraerPatentesPorTipo(eventos, "D1"),
      distraccion: extraerPatentesPorTipo(eventos, "D3"),
      vehiculosUnicos: Array.from(new Set(eventos.map((e) => e.vehiculo?.trim()).filter((v) => v && v !== ""))),
    }
  }, [eventos])

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

  const handleExportPNG = useCallback(async () => {
    setIsExporting(true)
    try {
      await exportDashboardPNG("alert-dashboard-export")
    } catch (error) {
      console.error("Error al exportar PNG:", error)
      alert("Error al exportar la imagen. Por favor, intentá nuevamente.")
    } finally {
      setIsExporting(false)
    }
  }, [])

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true)
    try {
      await exportDashboardPDF("alert-dashboard-export")
    } catch (error) {
      console.error("Error al exportar PDF:", error)
      alert("Error al exportar el PDF. Por favor, intentá nuevamente.")
    } finally {
      setIsExporting(false)
    }
  }, [])

  // Ref para evitar llamadas repetidas al callback
  const exportFunctionsRef = useRef<{
    exportPNG: () => Promise<void>
    exportPDF: () => Promise<void>
  } | null>(null)

  // Actualizar ref cuando cambian las funciones
  useEffect(() => {
    exportFunctionsRef.current = {
      exportPNG: handleExportPNG,
      exportPDF: handleExportPDF,
    }
  }, [handleExportPNG, handleExportPDF])

  // Exponer funciones de exportación al componente padre
  useEffect(() => {
    if (onExportFunctionsReady && exportFunctionsRef.current) {
      // Solo llamar si las funciones han cambiado realmente
      onExportFunctionsReady(exportFunctionsRef.current)
    }
  }, [onExportFunctionsReady])

  return (
    <div id="alert-dashboard-export" className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Botón de exportación - Solo mostrar si no está oculto */}
        {!hideExportButton && (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isExporting}
                  className="gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Exportar
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPNG} disabled={isExporting}>
                  <FileImage className="h-4 w-4 mr-2" />
                  Exportar Imagen (PNG)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Header con información de vehículos */}
        <Card className="p-4 bg-white rounded-xl shadow-sm border border-gray-200/60">
          <p className="text-sm text-gray-700">
            Vehículos involucrados: <span className="font-semibold">{vehiculosInfo.totalVehiculos}</span>
            {vehiculosInfo.patentePrincipal && (
              <>
                {" · "}Patente principal: <span className="font-semibold">{vehiculosInfo.patentePrincipal}</span>
              </>
            )}
            {vehiculosInfo.operadorPrincipal && (
              <>
                {" · "}Operador principal: <span className="font-semibold">{vehiculosInfo.operadorPrincipal}</span>
              </>
            )}
          </p>
        </Card>

        {/* BLOQUE SUPERIOR — ALERTA PRINCIPAL (HERO BANNER) */}
        {criticalAlert && (
          <Card className="w-full rounded-2xl shadow-xl border border-red-300/60 overflow-hidden bg-gradient-to-br from-red-50 via-red-50/80 to-red-100/50 p-8">
            <div className="flex items-start gap-6">
              {/* Ícono grande en círculo con animación */}
              <div className="flex-shrink-0">
                <DashboardIcon icon={AlertTriangle} color="critical" size="lg" animate={true} />
              </div>
              
              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-6 mb-3">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-red-950 mb-3 tracking-tight">
                      ALERTA CRÍTICA DE SEGURIDAD
                    </h2>
                    <p className="text-base text-red-900 leading-relaxed">
                      Conductor <span className="font-semibold">{criticalAlert.operador}</span> registró múltiples eventos de fatiga{" "}
                      {criticalAlert.fechaInicio.getTime() === criticalAlert.fechaFin.getTime() 
                        ? <>el <span className="font-semibold">{formatFecha(criticalAlert.fechaInicio)}</span></>
                        : <>entre el <span className="font-semibold">{formatFecha(criticalAlert.fechaInicio)}</span> y el{" "}
                          <span className="font-semibold">{formatFecha(criticalAlert.fechaFin)}</span></>
                      }. Riesgo alto de accidente.
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
            subtitle={patentesPorTipo.criticos.length === 0 ? "Fatiga y distracción" : undefined}
            patentes={patentesPorTipo.criticos.length > 0 ? patentesPorTipo.criticos : undefined}
          />

          {/* Eventos de fatiga */}
          <KpiCard
            icon={Eye}
            iconColor="warning"
            value={kpis.eventosFatiga}
            title="Eventos de fatiga"
            subtitle={patentesPorTipo.fatiga.length === 0 ? "Parpadeo pesado" : undefined}
            patentes={patentesPorTipo.fatiga.length > 0 ? patentesPorTipo.fatiga : undefined}
          />

          {/* Eventos de distracción */}
          <KpiCard
            icon={EyeOff}
            iconColor="yellow"
            value={kpis.eventosDistraccion}
            title="Eventos de distracción"
            subtitle={patentesPorTipo.distraccion.length === 0 ? "Sin mirar al frente" : undefined}
            patentes={patentesPorTipo.distraccion.length > 0 ? patentesPorTipo.distraccion : undefined}
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
            patentes={patentesPorTipo.vehiculosUnicos.length > 0 ? patentesPorTipo.vehiculosUnicos : undefined}
          />

          {/* Operadores únicos */}
          <KpiCard
            icon={Users}
            iconColor="gray"
            value={kpis.operadoresUnicos}
            title="Operadores únicos"
            subtitle={vehiculosInfo.operadorPrincipal || undefined}
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
          <Card className="p-8 bg-white rounded-2xl shadow-md border border-gray-200/60 hover:shadow-xl transition-shadow">
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
                      <span className="text-sm font-medium text-gray-600">{entry.name}</span>
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
          <Card className="p-8 bg-white rounded-2xl shadow-md border border-gray-200/60 hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-bold mb-6 text-gray-900">
              Eventos por franja horaria
            </h3>
            {eventosPorFranja.some((f) => f.eventos > 0) ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventosPorFranja} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="franja"
                      tick={{ fontSize: 14, fontWeight: 700, fill: "#111827" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 13, fontWeight: 600, fill: "#374151" }}
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
