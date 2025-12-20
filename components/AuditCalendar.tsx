"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AuditFile } from "@/parsers/auditParser"
import {
  normalizeDate,
  formatDateDDMMAA,
  formatDateDDMMAAAA,
} from "@/utils/date"

interface AuditCalendarProps {
  auditFiles: AuditFile[]
}

/**
 * Helpers para obtener métricas oficiales desde headers
 * REGLA: Solo usar valores desde audit.headers (mapeados desde Excel)
 * NO usar valores calculados desde audit.totals
 */

/**
 * Obtiene el porcentaje de cumplimiento oficial desde headers
 * Busca en orden: cumplimiento_total_pct, porcentaje_cumplimiento
 */
function getCumplimientoPct(headers: AuditFile["headers"]): number | null {
  const value =
    headers.cumplimiento_total_pct ?? headers.porcentaje_cumplimiento ?? null

  if (value === null || value === undefined) return null

  // Convertir a número si es necesario
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const num = parseFloat(value.replace(/%/g, "").replace(/,/g, ".").trim())
    return isNaN(num) ? null : num
  }

  return null
}

/**
 * Obtiene un valor numérico desde headers con fallback a null
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

/**
 * Obtiene el color según el porcentaje de cumplimiento
 */
function getCumplimientoColor(porcentaje: number): string {
  if (porcentaje >= 90) return "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100"
  if (porcentaje >= 70) return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100"
  if (porcentaje >= 50) return "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100"
  return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100"
}

/**
 * Abreviaturas de meses en español
 */
const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]

/**
 * Obtiene el índice del mes (0-11) desde una fecha
 */
function getMonthIndex(date: Date | null): number | null {
  if (!date) return null
  return date.getMonth()
}

/**
 * Modal de detalles de auditoría
 */
function AuditDetailModal({
  auditFile,
  open,
  onOpenChange,
}: {
  auditFile: AuditFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!auditFile) return null

  const fecha = normalizeDate(auditFile.headers.fecha)
  const fechaFormateada = fecha ? formatDateDDMMAAAA(fecha) : "Sin fecha"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de Auditoría</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Archivo</p>
              <p className="text-sm font-semibold">{auditFile.fileName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha</p>
              <p className="text-sm font-semibold">{fechaFormateada}</p>
            </div>
          </div>

          {/* Headers principales */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold border-b pb-2">Información General</h3>
            <div className="grid grid-cols-2 gap-4">
              {auditFile.headers.operacion && (
                <div>
                  <p className="text-xs text-muted-foreground">Operación</p>
                  <p className="text-sm font-medium">{String(auditFile.headers.operacion)}</p>
                </div>
              )}
              {auditFile.headers.cliente && (
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{String(auditFile.headers.cliente)}</p>
                </div>
              )}
              {auditFile.headers.auditor && (
                <div>
                  <p className="text-xs text-muted-foreground">Auditor</p>
                  <p className="text-sm font-medium">{String(auditFile.headers.auditor)}</p>
                </div>
              )}
              {auditFile.headers.responsable_operacion && (
                <div>
                  <p className="text-xs text-muted-foreground">Responsable</p>
                  <p className="text-sm font-medium">
                    {String(auditFile.headers.responsable_operacion)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Métricas Oficiales desde Headers */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold border-b pb-2">Métricas Oficiales</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getHeaderNumber(auditFile.headers, "cantidad_items") !== null && (
                <div className="text-center p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Items</p>
                  <p className="text-lg font-bold">
                    {getHeaderNumber(auditFile.headers, "cantidad_items")}
                  </p>
                </div>
              )}
              {getHeaderNumber(auditFile.headers, "cantidad_cumple") !== null && (
                <div className="text-center p-3 rounded-md bg-green-500/10">
                  <p className="text-xs text-muted-foreground">Cumple</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">
                    {getHeaderNumber(auditFile.headers, "cantidad_cumple")}
                  </p>
                </div>
              )}
              {getHeaderNumber(auditFile.headers, "cantidad_cumple_parcial") !== null && (
                <div className="text-center p-3 rounded-md bg-yellow-500/10">
                  <p className="text-xs text-muted-foreground">Cumple Parcial</p>
                  <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                    {getHeaderNumber(auditFile.headers, "cantidad_cumple_parcial")}
                  </p>
                </div>
              )}
              {getHeaderNumber(auditFile.headers, "cantidad_no_cumple") !== null && (
                <div className="text-center p-3 rounded-md bg-red-500/10">
                  <p className="text-xs text-muted-foreground">No Cumple</p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">
                    {getHeaderNumber(auditFile.headers, "cantidad_no_cumple")}
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {getHeaderNumber(auditFile.headers, "cantidad_no_aplica") !== null && (
                <div className="text-center p-3 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground">No Aplica</p>
                  <p className="text-lg font-bold">
                    {getHeaderNumber(auditFile.headers, "cantidad_no_aplica")}
                  </p>
                </div>
              )}
              {getCumplimientoPct(auditFile.headers) !== null && (
                <div
                  className={cn(
                    "text-center p-3 rounded-md",
                    getCumplimientoColor(getCumplimientoPct(auditFile.headers)!)
                  )}
                >
                  <p className="text-xs text-muted-foreground">% Cumplimiento</p>
                  <p className="text-lg font-bold">
                    {getCumplimientoPct(auditFile.headers)!.toFixed(2)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Metadata adicional */}
          {Object.keys(auditFile.headers).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-2">Información Adicional</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(auditFile.headers)
                  .filter(
                    ([key]) =>
                      !["fecha", "operacion", "cliente", "auditor", "responsable_operacion"].includes(
                        key
                      )
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm font-medium">
                        {value === null || value === undefined
                          ? "N/A"
                          : value instanceof Date
                            ? formatDateDDMMAAAA(value)
                            : String(value)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Componente principal del calendario de auditorías - Vista Operación/Mes
 */
export function AuditCalendar({ auditFiles }: AuditCalendarProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedAudit, setSelectedAudit] = useState<AuditFile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Agrupar auditorías por operación y mes
  const dataByOperacionAndMonth = useMemo(() => {
    const grouped = new Map<string, Map<number, AuditFile[]>>()

    auditFiles.forEach((audit) => {
      const fecha = normalizeDate(audit.headers.fecha)
      if (!fecha) return

      const monthIndex = fecha.getMonth()
      const year = fecha.getFullYear()
      
      // Solo incluir si es del año actual
      if (year !== currentYear) return

      const operacion = audit.headers.operacion
        ? String(audit.headers.operacion).trim()
        : audit.fileName

      if (!grouped.has(operacion)) {
        grouped.set(operacion, new Map())
      }

      const operacionMap = grouped.get(operacion)!
      if (!operacionMap.has(monthIndex)) {
        operacionMap.set(monthIndex, [])
      }

      operacionMap.get(monthIndex)!.push(audit)
    })

    return grouped
  }, [auditFiles, currentYear])

  // Obtener lista única de operaciones ordenadas
  const operaciones = useMemo(() => {
    return Array.from(dataByOperacionAndMonth.keys()).sort()
  }, [dataByOperacionAndMonth])

  const handlePreviousYear = () => {
    setCurrentYear(currentYear - 1)
  }

  const handleNextYear = () => {
    setCurrentYear(currentYear + 1)
  }

  const handleCellClick = (auditFile: AuditFile) => {
    setSelectedAudit(auditFile)
    setIsModalOpen(true)
  }

  // Obtener la primera auditoría de una celda (operación/mes)
  const getAuditForCell = (operacion: string, monthIndex: number): AuditFile | null => {
    const operacionMap = dataByOperacionAndMonth.get(operacion)
    if (!operacionMap) return null
    
    const audits = operacionMap.get(monthIndex)
    return audits && audits.length > 0 ? audits[0] : null
  }

  // Obtener todas las auditorías de una celda
  const getAllAuditsForCell = (operacion: string, monthIndex: number): AuditFile[] => {
    const operacionMap = dataByOperacionAndMonth.get(operacion)
    if (!operacionMap) return []
    
    return operacionMap.get(monthIndex) || []
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Calendario de Auditorías - Operación/Mes</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousYear}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[100px] text-center font-semibold">
              {currentYear}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextYear}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background border p-2 text-left font-semibold min-w-[200px]">
                    OPERACIÓN
                  </th>
                  {MONTHS.map((month) => (
                    <th
                      key={month}
                      className="border p-2 text-center font-semibold min-w-[120px]"
                    >
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operaciones.map((operacion) => {
                  const operacionMap = dataByOperacionAndMonth.get(operacion)!
                  
                  return (
                    <tr key={operacion}>
                      <td className="sticky left-0 z-10 bg-background border p-2 font-medium">
                        {operacion}
                      </td>
                      {MONTHS.map((_, monthIndex) => {
                        const audit = getAuditForCell(operacion, monthIndex)
                        const allAudits = getAllAuditsForCell(operacion, monthIndex)
                        
                        if (!audit) {
                          return (
                            <td
                              key={monthIndex}
                              className="border p-2 text-center text-muted-foreground"
                            >
                              -
                            </td>
                          )
                        }

                        const porcentaje = getCumplimientoPct(audit.headers)
                        if (porcentaje === null) {
                          return (
                            <td
                              key={monthIndex}
                              className="border p-2 text-center text-muted-foreground"
                            >
                              -
                            </td>
                          )
                        }
                        const colorClass = getCumplimientoColor(porcentaje)
                        const responsable = audit.headers.responsable_operacion
                          ? String(audit.headers.responsable_operacion)
                          : null
                        const auditor = audit.headers.auditor
                          ? String(audit.headers.auditor)
                          : null

                        return (
                          <td
                            key={monthIndex}
                            className={cn(
                              "border p-2 text-center cursor-pointer transition-all hover:shadow-md",
                              colorClass
                            )}
                            onClick={() => handleCellClick(audit)}
                          >
                            <div className="font-bold text-base mb-1">
                              {porcentaje.toFixed(0)}%
                            </div>
                            {responsable && (
                              <div className="text-xs opacity-80">
                                R: {responsable}
                              </div>
                            )}
                            {auditor && (
                              <div className="text-xs opacity-80">
                                A: {auditor}
                              </div>
                            )}
                            {allAudits.length > 1 && (
                              <div className="text-xs mt-1 opacity-60">
                                +{allAudits.length - 1} más
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs font-medium mb-2">Leyenda de colores:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700" />
              <span>≥ 90%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700" />
              <span>70% - 89%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700" />
              <span>50% - 69%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700" />
              <span>&lt; 50%</span>
            </div>
          </div>
        </div>
      </CardContent>

      <AuditDetailModal
        auditFile={selectedAudit}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </Card>
  )
}

