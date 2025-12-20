"use client"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import type { AuditFile } from "@/parsers/auditParser"

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
  const allHeaderKeys = new Set<string>()

  safeResults.forEach((result) => {
    Object.keys(result.headers).forEach((key) => allHeaderKeys.add(key))
  })
  
  // Agregar columnas de totales (solo una vez)
  allHeaderKeys.add("totalItems")
  allHeaderKeys.add("cumple")
  allHeaderKeys.add("cumple_parcial")
  allHeaderKeys.add("no_cumple")
  allHeaderKeys.add("no_aplica")
  allHeaderKeys.add("porcentajeCumplimiento")

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
      totalItems: "Total ítems",
      cumple: "Cumple",
      cumple_parcial: "Cumple parcial",
      no_cumple: "No cumple",
      no_aplica: "No aplica",
      porcentajeCumplimiento: "% Cumplimiento",
      operacion: "Operación",
      responsable_operacion: "Responsable",
      cliente: "Cliente",
      fecha: "Fecha",
      auditor: "Auditor",
      cantidad_items: "Cant. ítems",
      cumplimiento_total_pct: "% Cumplimiento total",
      puntos_obtenidos: "Puntos",
      cantidad_aplica: "Cant. aplica",
      cantidad_no_aplica: "Cant. no aplica",
      cantidad_cumple: "Cant. cumple",
      cantidad_no_cumple: "Cant. no cumple",
      porcentaje_cumplimiento: "% Cumplimiento",
    }
    return labelMap[col] || col
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
                    // Si es una columna de totales, usar result.totals
                    if (col === "totalItems") {
                      return (
                        <TableCell key={`header-${col}`}>
                          {formatValue(result.totals.totalItems)}
                        </TableCell>
                      )
                    }
                    if (col === "cumple") {
                      return (
                        <TableCell key={`header-${col}`}>
                          {formatValue(result.totals.cumple)}
                        </TableCell>
                      )
                    }
                    if (col === "cumple_parcial") {
                      return (
                        <TableCell key={`header-${col}`}>
                          {formatValue(result.totals.cumple_parcial)}
                        </TableCell>
                      )
                    }
                    if (col === "no_cumple") {
                      return (
                        <TableCell key={`header-${col}`}>
                          {formatValue(result.totals.no_cumple)}
                        </TableCell>
                      )
                    }
                    if (col === "no_aplica") {
                      return (
                        <TableCell key={`header-${col}`}>
                          {formatValue(result.totals.no_aplica)}
                        </TableCell>
                      )
                    }
                    if (col === "porcentajeCumplimiento") {
                      return (
                        <TableCell key={`header-${col}`}>
                          {formatValue(result.totals.porcentajeCumplimiento)}
                        </TableCell>
                      )
                    }
                    // Para otras columnas, usar headers
                    return (
                      <TableCell key={`header-${col}`}>
                        {result.headers[col] !== undefined ? formatValue(result.headers[col]) : ""}
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

