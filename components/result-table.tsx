"use client"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"

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

interface ResultTableProps {
  results: ProcessedResult[]
}

export function ResultTable({ results }: ResultTableProps) {
  // LOG para debugging
  console.log(`[ResultTable] Renderizando reporte consolidado con ${results.length} resultados`)
  results.forEach((result, idx) => {
    console.log(`  ${idx + 1}. ${result.fileName} - Headers: ${Object.keys(result.headers).length}, Rows: ${result.rows.length} (ignoradas en vista consolidada)`)
  })

  if (results.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">
          No hay resultados para mostrar. Procesá los archivos primero.
        </p>
      </Card>
    )
  }

  // Obtener todas las columnas únicas SOLO de headers (ignorar rows)
  const allHeaderKeys = new Set<string>()

  results.forEach((result) => {
    Object.keys(result.headers).forEach((key) => allHeaderKeys.add(key))
  })

  const headerColumns = Array.from(allHeaderKeys).sort()
  
  console.log(`[ResultTable] Columnas de headers (reporte consolidado): ${headerColumns.length}`)
  console.log(`[ResultTable] Columnas:`, headerColumns)

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Reporte consolidado</Label>
          <p className="text-sm text-muted-foreground">
            {results.length} archivo{results.length !== 1 ? "s" : ""} procesado{results.length !== 1 ? "s" : ""} • Una fila por archivo
          </p>
        </div>

        <ScrollArea className="h-[600px] w-full border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background z-10">Archivo</TableHead>
                {headerColumns.map((col) => (
                  <TableHead key={`header-${col}`} className="sticky top-0 bg-background z-10">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, fileIndex) => (
                <TableRow key={`file-${fileIndex}`}>
                  <TableCell className="font-medium">{result.fileName}</TableCell>
                  {headerColumns.map((col) => (
                    <TableCell key={`header-${col}`}>
                      {result.headers[col] !== undefined ? String(result.headers[col]) : ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </Card>
  )
}

