"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { VehiculoEventosFile, VehiculoEvento } from "@/domains/vehiculo/types"
import { format } from "date-fns"
import { pdf } from "@react-pdf/renderer"
import { FileDown, AlertTriangle, Car, Users, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateSecurityBanner } from "./securityAlerts"
import { SecurityAlertBanner } from "./SecurityAlertBanner"
import { VehiculoEventosPdfReport } from "./VehiculoEventosPdfReport"
import { EventChartsSection } from "./EventChartsSection"
import { ExecutiveSummary } from "./ExecutiveSummary"

interface EventLogViewProps {
  data: VehiculoEventosFile[]
}

export function EventLogView({ data }: EventLogViewProps) {
  // Combinar todos los eventos de todos los archivos
  const allEventos = useMemo(() => {
    return data.flatMap((file) => file.eventos)
  }, [data])

  // Obtener valores únicos para filtros
  const tiposEvento = useMemo(() => {
    const tipos = new Set<string>()
    allEventos.forEach((evento) => {
      if (evento.evento && evento.evento.trim() !== "") {
        tipos.add(evento.evento.trim())
      }
    })
    return Array.from(tipos).sort()
  }, [allEventos])

  const operadores = useMemo(() => {
    const ops = new Set<string>()
    allEventos.forEach((evento) => {
      if (evento.operador && evento.operador.trim() !== "") {
        ops.add(evento.operador.trim())
      }
    })
    return Array.from(ops).sort()
  }, [allEventos])

  const vehiculos = useMemo(() => {
    const vehs = new Set<string>()
    allEventos.forEach((evento) => {
      if (evento.vehiculo && evento.vehiculo.trim() !== "") {
        vehs.add(evento.vehiculo.trim())
      }
    })
    return Array.from(vehs).sort()
  }, [allEventos])

  // Estados de filtros
  const [filtroTipoEvento, setFiltroTipoEvento] = useState<string>("all")
  const [filtroOperador, setFiltroOperador] = useState<string>("all")
  const [filtroVehiculo, setFiltroVehiculo] = useState<string>("all")

  // Eventos filtrados
  const eventosFiltrados = useMemo(() => {
    return allEventos.filter((evento) => {
      if (filtroTipoEvento !== "all" && evento.evento.trim() !== filtroTipoEvento) {
        return false
      }
      if (filtroOperador !== "all" && evento.operador.trim() !== filtroOperador) {
        return false
      }
      if (filtroVehiculo !== "all" && evento.vehiculo.trim() !== filtroVehiculo) {
        return false
      }
      return true
    })
  }, [allEventos, filtroTipoEvento, filtroOperador, filtroVehiculo])

  // Estadísticas del resumen
  const totalEventos = allEventos.length
  const totalTipos = tiposEvento.length
  const eventosFiltradosCount = eventosFiltrados.length

  // KPIs ejecutivos adicionales
  const kpisEjecutivos = useMemo(() => {
    // Eventos críticos (D1 o D3)
    const eventosCriticos = allEventos.filter(
      (e) => e.evento?.trim() === "D1" || e.evento?.trim() === "D3"
    ).length

    // Eventos de fatiga (D1)
    const eventosFatiga = allEventos.filter(
      (e) => e.evento?.trim() === "D1"
    ).length

    // Vehículos únicos
    const vehiculosUnicos = new Set(
      allEventos
        .map((e) => e.vehiculo?.trim())
        .filter((v) => v && v !== "")
    ).size

    // Operadores únicos
    const operadoresUnicos = new Set(
      allEventos
        .map((e) => e.operador?.trim())
        .filter((o) => o && o !== "")
    ).size

    // Velocidad máxima registrada
    const velocidades = allEventos
      .map((e) => e.velocidad)
      .filter((v) => v > 0)
    const velocidadMaxima = velocidades.length > 0 ? Math.max(...velocidades) : 0

    return {
      eventosCriticos,
      eventosFatiga,
      vehiculosUnicos,
      operadoresUnicos,
      velocidadMaxima,
    }
  }, [allEventos])

  // Verificar si hay filtros activos
  const filtrosActivos = filtroTipoEvento !== "all" || filtroOperador !== "all" || filtroVehiculo !== "all"

  // Generar alerta de seguridad
  const securityAlert = useMemo(() => {
    return generateSecurityBanner(allEventos)
  }, [allEventos])

  // Formatear fecha
  const formatFecha = (fecha: Date) => {
    try {
      return format(fecha, "dd/MM/yyyy HH:mm")
    } catch {
      return fecha.toString()
    }
  }

  // Función para exportar PDF
  const handleExportPdf = async () => {
    try {
      const pdfDoc = <VehiculoEventosPdfReport data={data} securityAlert={securityAlert} />
      const blob = await pdf(pdfDoc).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `reporte-eventos-vehiculares-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error al generar PDF:", error)
      alert("Error al generar el PDF. Por favor, intentá nuevamente.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Título del reporte */}
      <div>
        <h2 className="text-2xl font-bold">Reporte de Eventos Vehiculares</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Análisis de telemetría y seguridad
        </p>
      </div>

      {/* KPIs básicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Total de eventos</p>
            <p className="text-2xl font-bold">{totalEventos.toLocaleString()}</p>
            {filtrosActivos && (
              <p className="text-xs text-muted-foreground">
                Mostrando {eventosFiltradosCount.toLocaleString()} con filtros
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Tipos de evento</p>
            <p className="text-2xl font-bold">{totalTipos}</p>
            {tiposEvento.length > 0 && (
              <p className="text-xs text-muted-foreground truncate">
                {tiposEvento.slice(0, 3).join(", ")}
                {tiposEvento.length > 3 && ` +${tiposEvento.length - 3} más`}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Archivos procesados</p>
            <p className="text-2xl font-bold">{data.length}</p>
            <p className="text-xs text-muted-foreground">
              {data.map((f) => f.fileName).join(", ")}
            </p>
          </div>
        </Card>
      </div>

      {/* Banner de alerta de seguridad */}
      <SecurityAlertBanner alert={securityAlert} />

      {/* KPIs ejecutivos adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-muted-foreground">Eventos críticos</p>
            </div>
            <p className="text-2xl font-bold">{kpisEjecutivos.eventosCriticos.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Eventos de alta prioridad</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-medium text-muted-foreground">Eventos de fatiga</p>
            </div>
            <p className="text-2xl font-bold">{kpisEjecutivos.eventosFatiga.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Microsueños detectados</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium text-muted-foreground">Vehículos únicos</p>
            </div>
            <p className="text-2xl font-bold">{kpisEjecutivos.vehiculosUnicos.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total distintos</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium text-muted-foreground">Operadores únicos</p>
            </div>
            <p className="text-2xl font-bold">{kpisEjecutivos.operadoresUnicos.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total distintos</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-purple-500" />
              <p className="text-sm font-medium text-muted-foreground">Velocidad máxima</p>
            </div>
            <p className="text-2xl font-bold">
              {kpisEjecutivos.velocidadMaxima > 0
                ? `${kpisEjecutivos.velocidadMaxima.toLocaleString()} km/h`
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground">Registrada</p>
          </div>
        </Card>
      </div>

      {/* Resumen Ejecutivo */}
      <ExecutiveSummary
        eventos={allEventos}
        kpisEjecutivos={kpisEjecutivos}
        securityAlert={securityAlert}
      />

      {/* Sección de gráficos */}
      <EventChartsSection eventos={allEventos} />

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="filtro-tipo-evento">Tipo de evento</Label>
            <Select value={filtroTipoEvento} onValueChange={setFiltroTipoEvento}>
              <SelectTrigger id="filtro-tipo-evento">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {tiposEvento.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filtro-operador">Operador</Label>
            <Select value={filtroOperador} onValueChange={setFiltroOperador}>
              <SelectTrigger id="filtro-operador">
                <SelectValue placeholder="Todos los operadores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los operadores</SelectItem>
                {operadores.map((operador) => (
                  <SelectItem key={operador} value={operador}>
                    {operador}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filtro-vehiculo">Vehículo</Label>
            <Select value={filtroVehiculo} onValueChange={setFiltroVehiculo}>
              <SelectTrigger id="filtro-vehiculo">
                <SelectValue placeholder="Todos los vehículos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vehículos</SelectItem>
                {vehiculos.map((vehiculo) => (
                  <SelectItem key={vehiculo} value={vehiculo}>
                    {vehiculo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabla de eventos */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Eventos</h3>
            <p className="text-sm text-muted-foreground">
              {eventosFiltradosCount.toLocaleString()} evento{eventosFiltradosCount !== 1 ? "s" : ""}
            </p>
          </div>

          <ScrollArea className="h-[600px] w-full rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Fecha</TableHead>
                  <TableHead className="w-[150px]">Evento</TableHead>
                  <TableHead className="w-[120px]">Operador</TableHead>
                  <TableHead className="w-[120px]">Vehículo</TableHead>
                  <TableHead className="w-[100px]">Velocidad</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay eventos que coincidan con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  eventosFiltrados.map((evento, index) => (
                    <TableRow key={`${evento.fecha.getTime()}-${index}`}>
                      <TableCell className="font-mono text-sm">
                        {formatFecha(evento.fecha)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{evento.evento}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {evento.operador || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {evento.vehiculo || "-"}
                      </TableCell>
                      <TableCell>
                        {evento.velocidad > 0 ? `${evento.velocidad} km/h` : "-"}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate text-sm text-muted-foreground">
                          {evento.descripcion || evento.texto || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </Card>

      {/* Botón de exportar PDF */}
      <div className="flex justify-end">
        <Button onClick={handleExportPdf} className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
    </div>
  )
}
