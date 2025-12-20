"use client"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import type { AuditFile } from "@/parsers/auditParser"

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

interface ResultTableProps {
  auditResults: AuditFile[]
}

export function ResultTable({ auditResults }: ResultTableProps) {
  // Proteger contra undefined/null
  const safeResults = auditResults || []
  
  // LOG para debugging
  console.log(`[ResultTable] Renderizando reporte consolidado con ${safeResults.length} resultados`)
  safeResults.forEach((result, idx) => {
    console.log(`  ${idx + 1}. ${result.fileName} - Headers: ${Object.keys(result.headers).length}`)
  })

  if (safeResults.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">
          No hay resultados para mostrar. Procesá los archivos primero.
        </p>
      </Card>
    )
  }

  // Obtener todas las columnas únicas de headers
  // REGLA: Solo mostrar columnas desde headers (métricas oficiales)
  const allHeaderKeys = new Set<string>()

  safeResults.forEach((result) => {
    Object.keys(result.headers).forEach((key) => allHeaderKeys.add(key))
  })

  const headerColumns = Array.from(allHeaderKeys).sort()
  
  console.log(`[ResultTable] Columnas de headers (reporte consolidado): ${headerColumns.length}`)
  console.log(`[ResultTable] Columnas:`, headerColumns)

  // Función helper para formatear valores
  const formatValue = (value: string | number | Date | null): string => {
    if (value === null || value === undefined) return ""
    if (value instanceof Date) {
      return value.toLocaleDateString("es-AR")
    }
    if (typeof value === "number") {
      // Si es un porcentaje, formatear con 2 decimales y %
      if (headerColumns.includes("porcentajeCumplimiento") && Math.abs(value) <= 100) {
        return `${value.toFixed(2)}%`
      }
      return value.toString()
    }
    return String(value)
  }

  // Función helper para obtener labels legibles de las columnas
  const getColumnLabel = (col: string): string => {
    const labelMap: Record<string, string> = {
      operacion: "Operación",
      responsable_operacion: "Responsable",
      cliente: "Cliente",
      fecha: "Fecha",
      auditor: "Auditor",
      cantidad_items: "Cant. ítems",
      cumplimiento_total_pct: "% Cumplimiento total",
      porcentaje_cumplimiento: "% Cumplimiento",
      puntos_obtenidos: "Puntos",
      cantidad_aplica: "Cant. aplica",
      cantidad_no_aplica: "Cant. no aplica",
      cantidad_cumple: "Cant. cumple",
      cantidad_cumple_parcial: "Cant. cumple parcial",
      cantidad_no_cumple: "Cant. no cumple",
    }
    return labelMap[col] || col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Reporte consolidado</Label>
          <p className="text-sm text-muted-foreground">
            {safeResults.length} archivo{safeResults.length !== 1 ? "s" : ""} procesado{safeResults.length !== 1 ? "s" : ""} • Una fila por archivo
          </p>
        </div>

        <ScrollArea className="h-[600px] w-full border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background z-10">Archivo</TableHead>
                {headerColumns.map((col) => (
                  <TableHead key={`header-${col}`} className="sticky top-0 bg-background z-10">
                    {getColumnLabel(col)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeResults.map((result, fileIndex) => (
                <TableRow key={`file-${fileIndex}`}>
                  <TableCell className="font-medium">{result.fileName}</TableCell>
                  {headerColumns.map((col) => {
                    // REGLA: Solo usar valores desde headers (métricas oficiales)
                    const value = result.headers[col]
                    
                    // Formatear porcentajes especiales
                    if (col === "cumplimiento_total_pct" || col === "porcentaje_cumplimiento") {
                      const pct = getCumplimientoPct(result.headers)
                      return (
                        <TableCell key={`header-${col}`}>
                          {pct !== null ? formatValue(pct) : ""}
                        </TableCell>
                      )
                    }
                    
                    return (
                      <TableCell key={`header-${col}`}>
                        {value !== undefined && value !== null ? formatValue(value) : ""}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </Card>
  )
}

