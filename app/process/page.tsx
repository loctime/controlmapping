"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AuditHeader } from "@/components/audit-header"
import { MultiFileUpload } from "@/components/multi-file-upload"
import { ResultTable } from "@/components/result-table"
import { DashboardGeneral } from "@/components/dashboard-general"
import { AuditCalendar } from "@/components/AuditCalendar"
import { getSchemaTemplate } from "@/lib/firebase"
import { parseAudit, type AuditFile } from "@/parsers/auditParser"
import type { SchemaInstance, SchemaTemplate, SchemaFieldMapping, ExcelData } from "@/types/excel"
import { Loader2 } from "lucide-react"

interface ProcessedResult {
  fileName: string
  headers: Record<string, string | number>
  rows: Array<Record<string, string | number>>
  // Valores calculados desde los datos reales del mapping
  calculated: {
    fecha: Date | null // Fecha convertida correctamente desde Excel
    totalItems: number // cumple + cumple_parcial + no_cumple (sin no_aplica)
    cumple: number
    cumple_parcial: number
    no_cumple: number
    no_aplica: number
    porcentajeCumplimiento: number // (cumple + cumple_parcial * 0.5) / totalItems
  }
}

export default function ProcessPage() {
  const [selectedMapping, setSelectedMapping] = useState<(SchemaInstance & { id: string; name: string }) | null>(null)
  const [schemaTemplate, setSchemaTemplate] = useState<SchemaTemplate | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<ProcessedResult[]>([])
  const [auditFiles, setAuditFiles] = useState<AuditFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar schema template cuando se selecciona un mapping
  const handleMappingSelect = async (mapping: (SchemaInstance & { id: string; name: string }) | null) => {
    setSelectedMapping(mapping)
    setResults([])
    setError(null)
    
    if (mapping) {
      try {
        const template = await getSchemaTemplate(mapping.schemaId)
        if (!template) {
          setError(`No se encontró el schema template para ${mapping.schemaId}`)
          setSchemaTemplate(null)
        } else {
          setSchemaTemplate(template)
        }
      } catch (err) {
        console.error("Error al cargar schema template:", err)
        setError("Error al cargar el schema template")
        setSchemaTemplate(null)
      }
    } else {
      setSchemaTemplate(null)
    }
  }

  // Función simplificada para leer Excel (solo valores de celdas)
  const readExcelFile = async (file: File): Promise<ExcelData> => {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellStyles: false,
      cellHTML: false,
    })

    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")

    const cells: Record<string, { value: string | number; style?: any }> = {}

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = worksheet[cellAddress]

        if (cell) {
          let cellValue: string | number = ""
          if (cell.v !== undefined && cell.v !== null) {
            if (cell.t === "n") {
              cellValue = cell.v as number
            } else if (cell.t === "b") {
              cellValue = cell.v ? "TRUE" : "FALSE"
            } else {
              cellValue = String(cell.v)
            }
          }

          cells[cellAddress] = {
            value: cellValue,
          }
        }
      }
    }

    return {
      fileName: file.name,
      sheets: [
        {
          name: firstSheetName,
          rows: range.e.r + 1,
          cols: range.e.c + 1,
          cells,
        },
      ],
    }
  }

  // Función para obtener el valor de una celda
  const getCellValue = (excelData: ExcelData, cellId: string): string | number => {
    const cell = excelData.sheets[0]?.cells[cellId]
    return cell?.value ?? ""
  }

  // Función para obtener el número de columna desde una letra (A=0, B=1, etc.)
  const columnLetterToNumber = (letter: string): number => {
    try {
      // Usar XLSX.utils para convertir la letra a número de columna
      // XLSX.utils.decode_cell espera una referencia completa (ej: "A1"), pero podemos usar decode_range
      // Alternativamente, podemos hacer la conversión manualmente
      let result = 0
      for (let i = 0; i < letter.length; i++) {
        const charCode = letter.charCodeAt(i)
        if (charCode >= 65 && charCode <= 90) {
          // A-Z
          result = result * 26 + (charCode - 64)
        } else if (charCode >= 97 && charCode <= 122) {
          // a-z
          result = result * 26 + (charCode - 96)
        }
      }
      return result > 0 ? result - 1 : 0
    } catch {
      return 0
    }
  }

  // Función para obtener el número de fila desde una referencia de celda (A1 -> 0, B2 -> 1, etc.)
  const getRowNumber = (cellId: string): number => {
    const match = cellId.match(/(\d+)/)
    return match ? parseInt(match[1], 10) - 1 : 0
  }

  // Función para convertir fecha de Excel (número serial) a Date de JavaScript
  const excelDateToJSDate = (excelDate: string | number): Date | null => {
    try {
      let serial: number
      
      if (typeof excelDate === "number") {
        serial = excelDate
      } else if (typeof excelDate === "string") {
        // Intentar parsear como número
        const parsed = parseFloat(excelDate.replace(",", "."))
        if (isNaN(parsed)) {
          // Intentar parsear como fecha string
          const dateStr = new Date(excelDate)
          if (!isNaN(dateStr.getTime())) {
            return dateStr
          }
          return null
        }
        serial = parsed
      } else {
        return null
      }

      // Excel cuenta días desde el 1 de enero de 1900
      // Pero Excel tiene un bug: considera 1900 como año bisiesto (no lo es)
      // Por eso usamos 25569 días en lugar de 25567
      const excelEpoch = new Date(1899, 11, 30) // 30 de diciembre de 1899
      const jsDate = new Date(excelEpoch.getTime() + serial * 86400000)
      
      return isNaN(jsDate.getTime()) ? null : jsDate
    } catch {
      return null
    }
  }

  // Función para verificar si un valor indica verdadero (para campos booleanos)
  const checkBooleanValue = (value: any): boolean => {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
      const upper = value.toUpperCase().trim()
      return upper === "TRUE" || upper === "1" || upper === "SÍ" || upper === "SI" || upper === "YES"
    }
    if (typeof value === "number") return value === 1
    return false
  }

  // Función para calcular métricas de cumplimiento desde las filas
  const calculateCumplimientoMetrics = (rows: Array<Record<string, string | number>>) => {
    let cumple = 0
    let cumple_parcial = 0
    let no_cumple = 0
    let no_aplica = 0

    rows.forEach((row) => {
      if (checkBooleanValue(row.cumple)) cumple++
      if (checkBooleanValue(row.cumple_parcial)) cumple_parcial++
      if (checkBooleanValue(row.no_cumple)) no_cumple++
      if (checkBooleanValue(row.no_aplica)) no_aplica++
    })

    // total_items = cumple + cumple_parcial + no_cumple (no_aplica NO entra)
    const totalItems = cumple + cumple_parcial + no_cumple

    // porcentaje_cumplimiento = (cumple + cumple_parcial * 0.5) / totalItems
    const porcentajeCumplimiento =
      totalItems > 0 ? ((cumple + cumple_parcial * 0.5) / totalItems) * 100 : 0

    return {
      totalItems,
      cumple,
      cumple_parcial,
      no_cumple,
      no_aplica,
      porcentajeCumplimiento: Math.round(porcentajeCumplimiento * 100) / 100,
    }
  }

  // Función para extraer datos de una columna completa
  const extractColumnData = (
    excelData: ExcelData,
    columnLetter: string,
    startRow: number = 0
  ): Array<string | number> => {
    const columnNumber = columnLetterToNumber(columnLetter)
    const sheet = excelData.sheets[0]
    const values: Array<string | number> = []

    // Buscar desde startRow hasta el final de la hoja
    // Usar un límite razonable para evitar procesar demasiadas filas vacías
    const maxRows = Math.min(sheet.rows, startRow + 1000)
    
    for (let row = startRow; row < maxRows; row++) {
      const cellId = XLSX.utils.encode_cell({ r: row, c: columnNumber })
      const value = getCellValue(excelData, cellId)
      // Solo agregar valores no vacíos para evitar filas vacías innecesarias
      if (value !== "" && value !== null && value !== undefined) {
        values.push(value)
      } else if (values.length > 0) {
        // Si ya hay valores y encontramos uno vacío, puede ser el final de los datos
        // Pero continuamos por si hay más datos después
        values.push(value)
      }
    }

    // Eliminar filas vacías al final
    while (values.length > 0 && (values[values.length - 1] === "" || values[values.length - 1] === null || values[values.length - 1] === undefined)) {
      values.pop()
    }

    return values
  }

  // Función para encontrar la fila de inicio de la tabla (después de los headers)
  const findTableStartRow = (excelData: ExcelData, headerMappings: SchemaFieldMapping[]): number => {
    // Buscar la fila máxima de los headerMappings y agregar 1
    let maxRow = 0
    let hasHeaderMappings = false
    
    headerMappings.forEach((mapping) => {
      if (!mapping.isColumn) {
        hasHeaderMappings = true
        const row = getRowNumber(mapping.cellOrColumn)
        if (row > maxRow) maxRow = row
      }
    })
    
    // Si no hay headerMappings, empezar desde la fila 0
    // Si hay headerMappings, empezar desde la fila siguiente a la máxima
    const startRow = hasHeaderMappings ? maxRow + 1 : 0
    
    return startRow
  }

  // Función principal de procesamiento
  const processFiles = async () => {
    if (!selectedMapping || !schemaTemplate || files.length === 0) {
      setError("Por favor seleccioná un mapeo y al menos un archivo Excel")
      return
    }

    setIsProcessing(true)
    setError(null)
    const processedResults: ProcessedResult[] = []
    const auditResults: AuditFile[] = []

    // Verificar si es un schema de auditoría
    const isAuditSchema = schemaTemplate?.type === "audit"

    // LOG: Archivos recibidos
    console.log("=== INICIO PROCESAMIENTO ===")
    console.log(`📁 Archivos recibidos: ${files.length}`)
    console.log(`📋 Tipo de schema: ${isAuditSchema ? "audit" : "general"}`)
    console.log("📋 Nombres de archivos:")
    files.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file.name}`)
    })

    try {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex]
        console.log(`\n🔄 Procesando archivo ${fileIndex + 1}/${files.length}: ${file.name}`)

        // Leer el archivo Excel
        const excelData = await readExcelFile(file)
        console.log(`  ✓ Archivo leído. Filas: ${excelData.sheets[0].rows}, Columnas: ${excelData.sheets[0].cols}`)

        // Si es schema de auditoría, usar parseAudit
        if (isAuditSchema) {
          try {
            const auditFile = parseAudit(excelData, schemaTemplate, selectedMapping)
            auditResults.push(auditFile)
            console.log(`  ✅ Archivo procesado con parseAudit: ${file.name}`)
            continue
          } catch (err) {
            console.error(`  ⚠ Error al procesar con parseAudit: ${err}`)
            // Continuar con el procesamiento normal como fallback
          }
        }

        // Extraer datos de headers usando headerMappings
        const headers: Record<string, string | number> = {}
        selectedMapping.headerMappings.forEach((mapping) => {
          if (!mapping.isColumn) {
            const value = getCellValue(excelData, mapping.cellOrColumn)
            headers[mapping.role] = value
          }
        })
        console.log(`  ✓ Headers extraídos: ${Object.keys(headers).length} campos`, headers)

        // Extraer datos de la tabla usando tableMappings
        const tableStartRow = findTableStartRow(excelData, selectedMapping.headerMappings)
        console.log(`  ✓ Fila de inicio de tabla calculada: ${tableStartRow + 1} (índice: ${tableStartRow})`)
        console.log(`  ✓ Total de filas en el Excel: ${excelData.sheets[0].rows}`)
        
        // Validar que tableStartRow no exceda el número de filas del Excel
        if (tableStartRow >= excelData.sheets[0].rows) {
          console.log(`  ⚠ ADVERTENCIA: tableStartRow (${tableStartRow}) >= filas totales (${excelData.sheets[0].rows}). Usando fila 0.`)
        }
        
        const rows: Array<Record<string, string | number>> = []

        // Obtener todas las columnas mapeadas
        const columnMappings = selectedMapping.tableMappings.filter((m) => m.isColumn)
        console.log(`  ✓ Columnas mapeadas para tabla: ${columnMappings.length}`)
        
        if (columnMappings.length > 0) {
          // Ajustar tableStartRow si es necesario
          const actualStartRow = Math.min(tableStartRow, excelData.sheets[0].rows - 1)
          if (actualStartRow !== tableStartRow) {
            console.log(`  ✓ Ajustando fila de inicio a: ${actualStartRow + 1} (índice: ${actualStartRow})`)
          }
          
          // Obtener la longitud máxima de todas las columnas
          const columnData: Record<string, Array<string | number>> = {}
          let maxLength = 0

          columnMappings.forEach((mapping) => {
            const columnLetter = mapping.cellOrColumn
            const data = extractColumnData(excelData, columnLetter, actualStartRow)
            columnData[mapping.role] = data
            console.log(`    - Columna ${columnLetter} (${mapping.role}): ${data.length} valores extraídos desde fila ${actualStartRow + 1}`)
            if (data.length > maxLength) maxLength = data.length
          })

          console.log(`  ✓ Longitud máxima de columnas: ${maxLength}`)

          // Construir filas combinando todas las columnas
          for (let i = 0; i < maxLength; i++) {
            const row: Record<string, string | number> = {}
            columnMappings.forEach((mapping) => {
              const data = columnData[mapping.role]
              row[mapping.role] = data[i] !== undefined ? data[i] : ""
            })
            rows.push(row)
          }
        } else {
          console.log(`  ⚠ No hay columnas mapeadas para tabla`)
        }

        console.log(`  ✓ Filas de tabla extraídas: ${rows.length}`)
        if (rows.length === 0) {
          console.log(`  ⚠ ADVERTENCIA: Este archivo no tiene filas de tabla`)
        }

        // Calcular métricas de cumplimiento desde los datos reales
        const cumplimientoMetrics = calculateCumplimientoMetrics(rows)
        console.log(`  ✓ Métricas calculadas:`, cumplimientoMetrics)

        // Convertir fecha de Excel a Date de JavaScript
        const fechaRaw = headers.fecha
        const fechaConvertida = excelDateToJSDate(fechaRaw)
        if (fechaConvertida) {
          console.log(`  ✓ Fecha convertida: ${fechaConvertida.toISOString().split('T')[0]}`)
        } else if (fechaRaw) {
          console.log(`  ⚠ No se pudo convertir la fecha: ${fechaRaw}`)
        }

        const result: ProcessedResult = {
          fileName: file.name,
          headers,
          rows,
          calculated: {
            fecha: fechaConvertida,
            totalItems: cumplimientoMetrics.totalItems,
            cumple: cumplimientoMetrics.cumple,
            cumple_parcial: cumplimientoMetrics.cumple_parcial,
            no_cumple: cumplimientoMetrics.no_cumple,
            no_aplica: cumplimientoMetrics.no_aplica,
            porcentajeCumplimiento: cumplimientoMetrics.porcentajeCumplimiento,
          },
        }
        processedResults.push(result)
        console.log(`  ✅ Archivo procesado: ${file.name} - Headers: ${Object.keys(headers).length}, Rows: ${rows.length}, Cumplimiento: ${cumplimientoMetrics.porcentajeCumplimiento.toFixed(2)}%`)
      }

      // LOG: Resumen final
      console.log(`\n=== RESUMEN FINAL ===`)
      console.log(`📊 Total de archivos procesados: ${processedResults.length}`)
      console.log(`📈 Resultados generados:`)
      processedResults.forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.fileName} - Headers: ${Object.keys(result.headers).length}, Rows: ${result.rows.length}`)
      })
      
      const filesWithRows = processedResults.filter(r => r.rows.length > 0).length
      const filesWithoutRows = processedResults.filter(r => r.rows.length === 0).length
      console.log(`  - Archivos con filas: ${filesWithRows}`)
      console.log(`  - Archivos sin filas: ${filesWithoutRows}`)

      setResults(processedResults)
      setAuditFiles(auditResults)
    } catch (err) {
      console.error("❌ Error al procesar archivos:", err)
      setError(`Error al procesar archivos: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const canProcess = selectedMapping !== null && schemaTemplate !== null && files.length > 0 && !isProcessing

  return (
    <div className="min-h-screen flex flex-col">
      <AuditHeader 
        selectedMappingId={selectedMapping?.id || null} 
        onMappingSelect={handleMappingSelect}
        title="Procesar múltiples archivos Excel"
      />
      <div className="container mx-auto py-8 px-4 max-w-7xl flex-1">
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground">
              Aplicá un mapeo guardado a múltiples archivos Excel y generá un reporte consolidado
            </p>
          </div>

          {error && (
            <Card className="p-4 border-destructive bg-destructive/10">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          <MultiFileUpload files={files} onFilesChange={setFiles} />

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Procesar archivos</p>
              <p className="text-sm text-muted-foreground">
                {files.length} archivo{files.length !== 1 ? "s" : ""} seleccionado{files.length !== 1 ? "s" : ""}
                {selectedMapping && ` • Mapeo: ${selectedMapping.name}`}
              </p>
            </div>
            <Button onClick={processFiles} disabled={!canProcess}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Procesar archivos"
              )}
            </Button>
          </div>
        </Card>

        {results.length > 0 && (
          <>
            {auditFiles.length > 0 && <AuditCalendar auditFiles={auditFiles} />}
            <DashboardGeneral results={results} />
            <ResultTable results={results} />
          </>
        )}
        </div>
      </div>
    </div>
  )
}

