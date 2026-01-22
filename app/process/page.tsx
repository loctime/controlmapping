"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AuditHeader } from "@/components/audit-header"
import { ResultTable } from "@/components/result-table"
import { DashboardGeneral } from "@/components/dashboard-general"
import { AuditDashboard } from "@/domains/audit/components/AuditDashboard"
import { OperationDashboard } from "@/domains/audit/components/OperationDashboard"
import { OperatorDashboard } from "@/domains/audit/components/OperatorDashboard"
import { AuditCalendar } from "@/domains/audit/components/AuditCalendar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getSchemaTemplate, getSchemaTemplates, getMappings } from "@/lib/firebase"
import type { SchemaInstance, SchemaTemplate, SchemaFieldMapping, ExcelData } from "@/types/excel"
import { getDomain } from "@/domains/registry"
// Importar dominios para que se registren automáticamente
import "@/domains/audit"
import "@/domains/vehiculo"
import type { AuditFile } from "@/domains/audit"
import type { VehiculoEventosFile } from "@/domains/vehiculo/types"
import { EventLogView } from "@/components/event-log/EventLogView"
import { Loader2, FileSpreadsheet, Upload, X, Download, FileDown, AlertTriangle } from "lucide-react"
import { normalizeDate } from "@/utils/date"

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
  // Schema selection
  const [availableSchemas, setAvailableSchemas] = useState<SchemaTemplate[]>([])
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [schemaTemplate, setSchemaTemplate] = useState<SchemaTemplate | null>(null)
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(true)
  
  // Mapping selection (filtrado por schema)
  const [availableMappings, setAvailableMappings] = useState<(SchemaInstance & { id: string; name: string })[]>([])
  const [selectedMapping, setSelectedMapping] = useState<(SchemaInstance & { id: string; name: string }) | null>(null)
  const [isLoadingMappings, setIsLoadingMappings] = useState(false)
  
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<ProcessedResult[]>([])
  const [auditFiles, setAuditFiles] = useState<AuditFile[]>([])
  const [vehiculoEventosFiles, setVehiculoEventosFiles] = useState<VehiculoEventosFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilesSheet, setShowFilesSheet] = useState(false)
  
  // Estado para tabs de visualización (Vista completa / Dashboard)
  const [viewTab, setViewTab] = useState<"completo" | "dashboard">("completo")
  
  // Funciones de exportación para eventos vehiculares (vista completa)
  const [vehiculoExportFunctions, setVehiculoExportFunctions] = useState<{
    exportPdf?: () => Promise<void>
    exportOnePager?: () => Promise<void>
    exportSecurityAlert?: () => Promise<void>
  } | null>(null)
  
  // Funciones de exportación para dashboard de eventos vehiculares
  const [vehiculoDashboardExportFunctions, setVehiculoDashboardExportFunctions] = useState<{
    exportPNG?: () => Promise<void>
    exportPDF?: () => Promise<void>
  } | null>(null)
  
  // Estados para tabs y selecciones de auditorías (solo para dashboard)
  const [activeTab, setActiveTab] = useState<"general" | "operation" | "operator">("general")
  const [selectedOperationId, setSelectedOperationId] = useState<string>("")
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("")
  
  // Cargar schemas disponibles al montar
  useEffect(() => {
    const loadSchemas = async () => {
      setIsLoadingSchemas(true)
      try {
        const schemas = await getSchemaTemplates()
        setAvailableSchemas(schemas)
        
        // Si hay schemas disponibles, seleccionar el primero por defecto
        if (schemas.length > 0 && !selectedSchemaId) {
          setSelectedSchemaId(schemas[0].schemaId)
        }
      } catch (error) {
        console.error("Error al cargar schemas:", error)
      } finally {
        setIsLoadingSchemas(false)
      }
    }
    
    loadSchemas()
  }, [])
  
  // Cargar schema template cuando se selecciona un schema
  useEffect(() => {
    const loadSchemaTemplate = async () => {
      if (!selectedSchemaId) {
        setSchemaTemplate(null)
        return
      }
      
      try {
        const template = await getSchemaTemplate(selectedSchemaId)
        if (template) {
          setSchemaTemplate(template)
        } else {
          console.error(`No se encontró el schema template para ${selectedSchemaId}`)
          setSchemaTemplate(null)
        }
      } catch (error) {
        console.error("Error al cargar schema template:", error)
        setSchemaTemplate(null)
      }
    }
    
    loadSchemaTemplate()
  }, [selectedSchemaId])
  
  // Cargar mapeos filtrados por schema cuando cambia el schema seleccionado
  useEffect(() => {
    const loadMappings = async () => {
      if (!selectedSchemaId) {
        setAvailableMappings([])
        setSelectedMapping(null)
        return
      }
      
      setIsLoadingMappings(true)
      try {
        const allMappings = await getMappings()
        // Filtrar mapeos por schemaId
        const filteredMappings = allMappings.filter((m) => m.schemaId === selectedSchemaId)
        setAvailableMappings(filteredMappings)
        
        // Si había un mapeo seleccionado pero no pertenece al nuevo schema, limpiarlo
        if (selectedMapping && selectedMapping.schemaId !== selectedSchemaId) {
          setSelectedMapping(null)
          setSchemaTemplate(null)
        }
      } catch (error) {
        console.error("Error al cargar mappings:", error)
        setAvailableMappings([])
      } finally {
        setIsLoadingMappings(false)
      }
    }
    
    loadMappings()
  }, [selectedSchemaId])


  // Cargar schema template cuando se selecciona un mapping
  const handleMappingSelect = async (mapping: (SchemaInstance & { id: string; name: string }) | null) => {
    setSelectedMapping(mapping)
    setResults([])
    setAuditFiles([])
    setVehiculoEventosFiles([])
    setError(null)
    
    if (mapping) {
      // Verificar que el mapping pertenezca al schema seleccionado
      if (selectedSchemaId && mapping.schemaId !== selectedSchemaId) {
        setError(`El mapeo seleccionado pertenece a otro schema (${mapping.schemaId})`)
        setSelectedMapping(null)
        setSchemaTemplate(null)
        return
      }
      
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

  /**
   * Normaliza un valor de fecha a Date | null
   * Centraliza la conversión para asegurar consistencia
   * NUNCA retorna string - solo Date o null
   */
  const normalizeHeaderDate = (value: string | number | Date | null | undefined): Date | null => {
    const normalized = normalizeDate(value)
    
    // Validación defensiva: si llegó algo que no es Date ni null, advertir
    if (value !== null && value !== undefined && !(value instanceof Date)) {
      const normalizedType = typeof normalized === "object" && normalized instanceof Date ? "Date" : typeof normalized
      if (normalized === null) {
        console.warn(`⚠️ normalizeHeaderDate: No se pudo convertir fecha. Valor: ${value}, Tipo: ${typeof value}`)
      }
    }
    
    return normalized
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
    const vehiculoEventosResults: VehiculoEventosFile[] = []

    // Obtener dominio desde registry (fallback a "audit" si no se especifica)
    const domain = getDomain(schemaTemplate?.type)

    // LOG: Archivos recibidos
    console.log("=== INICIO PROCESAMIENTO ===")
    console.log(`📁 Archivos recibidos: ${files.length}`)
    console.log(`📋 Tipo de schema: ${schemaTemplate?.type ?? "audit (default)"}`)
    console.log(`📋 Dominio: ${domain?.name ?? "desconocido"}`)
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

        // Si hay dominio registrado, usar su parser
        if (domain) {
          try {
            // Usar el parser del dominio genéricamente
            const parsedResult = domain.parser(excelData, schemaTemplate, selectedMapping)
            
            // Type guard para verificar si es AuditFile (dominio de auditoría)
            const isAuditFile = (result: unknown): result is AuditFile => {
              return (
                typeof result === "object" &&
                result !== null &&
                "fileName" in result &&
                "headers" in result &&
                "items" in result &&
                "totals" in result &&
                Array.isArray((result as any).items) &&
                typeof (result as any).totals === "object"
              )
            }
            
            // Type guard para verificar si es VehiculoEventosFile (dominio de eventos vehiculares)
            const isVehiculoEventosFile = (result: unknown): result is VehiculoEventosFile => {
              return (
                typeof result === "object" &&
                result !== null &&
                "fileName" in result &&
                "eventos" in result &&
                "totalEventos" in result &&
                "tiposEvento" in result &&
                Array.isArray((result as any).eventos) &&
                typeof (result as any).totalEventos === "number" &&
                Array.isArray((result as any).tiposEvento)
              )
            }
            
            if (isVehiculoEventosFile(parsedResult)) {
              // Es un archivo de eventos vehiculares
              vehiculoEventosResults.push(parsedResult)
              console.log(`  ✅ Archivo procesado como eventos vehiculares: ${file.name}`)
              console.log(`    - Total eventos: ${parsedResult.totalEventos}`)
              console.log(`    - Tipos de evento: ${parsedResult.tiposEvento.join(", ")}`)
              continue
            } else if (isAuditFile(parsedResult)) {
              const auditFile = parsedResult
              
              // Normalizar fecha a Date | null (requerido por AuditCalendar)
              // NUNCA guardar strings de fecha en headers - solo Date | null
              const fechaRaw = auditFile.headers.fecha
              const fechaNormalizada: Date | null = normalizeHeaderDate(fechaRaw)
              
              // Validación defensiva: asegurar que fechaNormalizada sea Date o null, nunca string
              if (fechaNormalizada !== null && !(fechaNormalizada instanceof Date)) {
                console.error(`❌ ERROR: fechaNormalizada no es Date ni null. Valor: ${fechaNormalizada}, Tipo: ${typeof fechaNormalizada}`)
                throw new Error(`Fecha normalizada inválida para ${file.name}`)
              }
              
              if (fechaNormalizada) {
                console.log(`  ✓ Fecha normalizada: ${fechaNormalizada.toISOString()} (tipo: Date)`)
              } else {
                console.log(`  ⚠ Fecha no encontrada o inválida para: ${file.name} (valor raw: ${fechaRaw}, tipo: ${typeof fechaRaw})`)
              }
              
              // Normalizar cumplimiento_total_pct a number (requerido por AuditCalendar)
              const cumplimientoRaw =
                auditFile.headers.cumplimiento_total_pct ??
                auditFile.headers.porcentaje_cumplimiento ??
                auditFile.totals.porcentajeCumplimiento
              let cumplimientoNormalizado: number
              if (typeof cumplimientoRaw === "number") {
                cumplimientoNormalizado = cumplimientoRaw
                console.log(`  ✓ Cumplimiento ya es number: ${cumplimientoNormalizado}`)
              } else if (typeof cumplimientoRaw === "string") {
                // Convertir string a number (remover % y parsear)
                const num = parseFloat(cumplimientoRaw.replace(/%/g, "").replace(/,/g, ".").trim())
                cumplimientoNormalizado = isNaN(num) ? auditFile.totals.porcentajeCumplimiento : num
                console.log(`  ✓ Cumplimiento convertido de string: "${cumplimientoRaw}" -> ${cumplimientoNormalizado}`)
              } else {
                cumplimientoNormalizado = auditFile.totals.porcentajeCumplimiento
                console.log(`  ✓ Cumplimiento desde totals: ${cumplimientoNormalizado}`)
              }
              
              // Log de validación final
              console.log(`  📊 Validación AuditFile para ${file.name}:`)
              console.log(`    - fecha: ${fechaNormalizada ? fechaNormalizada.toISOString() : 'null'} (tipo: ${fechaNormalizada instanceof Date ? 'Date' : typeof fechaNormalizada})`)
              console.log(`    - cumplimiento_total_pct: ${cumplimientoNormalizado} (tipo: ${typeof cumplimientoNormalizado})`)
              console.log(`    - operacion: ${auditFile.headers.operacion ?? auditFile.headers.cliente ?? auditFile.headers.establecimiento ?? 'Sin operación'}`)
              
              // Asegurar que fecha, cumplimiento_total_pct y operacion estén en headers (requerido por AuditCalendar)
              // Crear una copia del auditFile con headers actualizados
              // IMPORTANTE: fecha SIEMPRE debe ser Date | null, nunca string
              const auditFileWithHeaders: AuditFile = {
                ...auditFile,
                headers: {
                  ...auditFile.headers,
                  // CRÍTICO: fecha debe ser Date | null, nunca string
                  fecha: fechaNormalizada,
                  cumplimiento_total_pct: cumplimientoNormalizado,
                  operacion:
                    auditFile.headers.operacion ??
                    auditFile.headers.cliente ??
                    auditFile.headers.establecimiento ??
                    "Sin operación",
                },
              }
              
              // Validación defensiva final: verificar que headers.fecha sea Date | null
              const fechaFinal = auditFileWithHeaders.headers.fecha
              if (fechaFinal !== null && !(fechaFinal instanceof Date)) {
                console.error(`❌ ERROR CRÍTICO: auditFileWithHeaders.headers.fecha no es Date ni null. Valor: ${fechaFinal}, Tipo: ${typeof fechaFinal}`)
                console.error(`  Archivo: ${file.name}`)
                console.error(`  Headers completos:`, auditFileWithHeaders.headers)
                throw new Error(`Headers.fecha inválido para ${file.name}: debe ser Date | null, recibido ${typeof fechaFinal}`)
              }
              
              auditResults.push(auditFileWithHeaders)
              console.log(`  ✅ Archivo procesado con parser del dominio "${domain.name}": ${file.name}`)
              
              // Convertir AuditFile a ProcessedResult para unificar el flujo
              // Usar auditFileWithHeaders para asegurar que tenga fecha y cumplimiento_total_pct
              // Convertir headers: Date -> string/number
              const processedHeaders: Record<string, string | number> = {}
              Object.entries(auditFileWithHeaders.headers).forEach(([key, value]) => {
                if (value instanceof Date) {
                  processedHeaders[key] = value.toISOString().split('T')[0] // Formato YYYY-MM-DD
                } else if (value !== null && value !== undefined) {
                  processedHeaders[key] = value as string | number
                }
              })
              
              // Extraer fecha de headers si existe (ya está normalizada como Date en auditFileWithHeaders)
              // La fecha ya está normalizada como Date | null en auditFileWithHeaders para AuditCalendar
              const fechaConvertida: Date | null = auditFileWithHeaders.headers.fecha instanceof Date 
                ? auditFileWithHeaders.headers.fecha 
                : null
              
              // Asegurar que fecha esté en processedHeaders como string (para ProcessedResult)
              if (fechaConvertida && !processedHeaders.fecha) {
                processedHeaders.fecha = fechaConvertida.toISOString().split('T')[0] // Formato YYYY-MM-DD
              }
              
              // Asegurar que cumplimiento_total_pct esté en headers (requerido por AuditCalendar)
              // Ya debería estar en auditFileWithHeaders.headers, pero verificamos por si acaso
              if (!processedHeaders.cumplimiento_total_pct && !processedHeaders.porcentaje_cumplimiento) {
                processedHeaders.cumplimiento_total_pct = auditFileWithHeaders.totals.porcentajeCumplimiento
              }
              
              // Convertir items a rows: cada item debe tener campos cumple, cumple_parcial, no_cumple, no_aplica
              const processedRows: Array<Record<string, string | number>> = auditFileWithHeaders.items.map((item) => {
                const row: Record<string, string | number> = {
                  pregunta: item.pregunta,
                  cumple: item.estado === "cumple" ? 1 : 0,
                  cumple_parcial: item.estado === "cumple_parcial" ? 1 : 0,
                  no_cumple: item.estado === "no_cumple" ? 1 : 0,
                  no_aplica: item.estado === "no_aplica" ? 1 : 0,
                }
                if (item.observaciones) {
                  row.observaciones = item.observaciones
                }
                return row
              })
              
              // Construir ProcessedResult usando los totals del parser
              const processedResult: ProcessedResult = {
                fileName: auditFileWithHeaders.fileName,
                headers: processedHeaders,
                rows: processedRows,
                calculated: {
                  fecha: fechaConvertida,
                  totalItems: auditFileWithHeaders.totals.totalItems,
                  cumple: auditFileWithHeaders.totals.cumple,
                  cumple_parcial: auditFileWithHeaders.totals.cumple_parcial,
                  no_cumple: auditFileWithHeaders.totals.no_cumple,
                  no_aplica: auditFileWithHeaders.totals.no_aplica,
                  porcentajeCumplimiento: auditFileWithHeaders.totals.porcentajeCumplimiento,
                },
              }
              
              processedResults.push(processedResult)
              console.log(`  ✅ ProcessedResult creado para auditoría: ${file.name} - Headers: ${Object.keys(processedHeaders).length}, Rows: ${processedRows.length}, Cumplimiento: ${auditFileWithHeaders.totals.porcentajeCumplimiento.toFixed(2)}%`)
              continue
            }
          } catch (err) {
            console.error(`  ⚠ Error al procesar con parser del dominio "${domain.name}": ${err}`)
            // Continuar con el procesamiento genérico como fallback
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

      // LOG: Validación final de auditFiles antes de guardar
      console.log(`\n=== VALIDACIÓN FINAL DE AUDITFILES ===`)
      console.log(`📊 Total de auditFiles: ${auditResults.length}`)
      auditResults.forEach((af, idx) => {
        const fecha = af.headers.fecha
        const cumplimiento = af.headers.cumplimiento_total_pct
        const operacion = af.headers.operacion
        
        // Validación defensiva: fecha debe ser Date | null
        if (fecha !== null && !(fecha instanceof Date)) {
          console.error(`❌ ERROR: auditFiles[${idx}].headers.fecha no es Date ni null`)
          console.error(`  Archivo: ${af.fileName}`)
          console.error(`  Valor: ${fecha}, Tipo: ${typeof fecha}`)
          throw new Error(`Fecha inválida en auditFiles[${idx}]: debe ser Date | null`)
        }
        
        // Validación defensiva: cumplimiento_total_pct debe ser number
        if (cumplimiento !== null && typeof cumplimiento !== "number") {
          console.error(`❌ ERROR: auditFiles[${idx}].headers.cumplimiento_total_pct no es number`)
          console.error(`  Archivo: ${af.fileName}`)
          console.error(`  Valor: ${cumplimiento}, Tipo: ${typeof cumplimiento}`)
        }
        
        console.log(`  ${idx + 1}. ${af.fileName}:`)
        console.log(`    - fecha: ${fecha ? fecha.toISOString() : 'null'} (tipo: ${fecha instanceof Date ? 'Date' : 'null'})`)
        console.log(`    - cumplimiento_total_pct: ${cumplimiento} (tipo: ${typeof cumplimiento})`)
        console.log(`    - operacion: ${operacion || 'null'}`)
      })
      
      setResults(processedResults)
      setAuditFiles(auditResults)
      setVehiculoEventosFiles(vehiculoEventosResults)
    } catch (err) {
      console.error("❌ Error al procesar archivos:", err)
      setError(`Error al procesar archivos: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Función helper para convertir ProcessedResult a AuditFile (para ResultTable)
  const convertToAuditFile = (result: ProcessedResult): AuditFile => {
    // Convertir rows a items
    const items = result.rows.map((row) => {
      // Determinar el estado basado en los campos booleanos
      let estado: "cumple" | "cumple_parcial" | "no_cumple" | "no_aplica" = "no_cumple"
      if (checkBooleanValue(row.cumple)) {
        estado = "cumple"
      } else if (checkBooleanValue(row.cumple_parcial)) {
        estado = "cumple_parcial"
      } else if (checkBooleanValue(row.no_cumple)) {
        estado = "no_cumple"
      } else if (checkBooleanValue(row.no_aplica)) {
        estado = "no_aplica"
      }

      return {
        pregunta: String(row.pregunta || ""),
        estado,
        ...(row.observaciones ? { observaciones: String(row.observaciones) } : {}),
      }
    })

    // Convertir headers: string | number -> string | number | Date | null
    // IMPORTANTE: fecha debe ser Date | null, nunca string
    const auditHeaders: Record<string, string | number | Date | null> = {}
    Object.entries(result.headers).forEach(([key, value]) => {
      // Si es el campo fecha, normalizarlo SIEMPRE a Date | null
      if (key === "fecha") {
        auditHeaders[key] = normalizeHeaderDate(value as string | number | Date | null | undefined)
      } else {
        // Para otros campos, mantener el valor original
        auditHeaders[key] = value !== null && value !== undefined ? value : null
      }
    })

    // Asegurar que la fecha esté en headers si está en calculated
    // calculated.fecha ya es Date | null, así que podemos usarlo directamente
    if (result.calculated.fecha && !auditHeaders.fecha) {
      auditHeaders.fecha = result.calculated.fecha
    }
    
    // Validación defensiva: verificar que fecha sea Date | null
    if (auditHeaders.fecha !== null && !(auditHeaders.fecha instanceof Date)) {
      console.warn(`⚠️ convertToAuditFile: fecha no es Date ni null. Valor: ${auditHeaders.fecha}, Tipo: ${typeof auditHeaders.fecha}`)
      // Intentar normalizar de nuevo
      auditHeaders.fecha = normalizeHeaderDate(auditHeaders.fecha as string | number | Date | null | undefined)
    }
    
    // Asegurar que cumplimiento_total_pct esté en headers (requerido por AuditCalendar)
    // Si no está presente en headers, usar el porcentaje calculado
    if (!auditHeaders.cumplimiento_total_pct && !auditHeaders.porcentaje_cumplimiento) {
      auditHeaders.cumplimiento_total_pct = result.calculated.porcentajeCumplimiento
    }

    return {
      fileName: result.fileName,
      headers: auditHeaders,
      items,
      totals: {
        totalItems: result.calculated.totalItems,
        cumple: result.calculated.cumple,
        cumple_parcial: result.calculated.cumple_parcial,
        no_cumple: result.calculated.no_cumple,
        no_aplica: result.calculated.no_aplica,
        porcentajeCumplimiento: result.calculated.porcentajeCumplimiento,
      },
    }
  }

  // Combinar auditFiles con ProcessedResult convertidos para ResultTable
  // IMPORTANTE: Solo incluir auditFiles que ya tienen fecha como Date | null
  // Los ProcessedResult convertidos también deben tener fecha normalizada
  const allAuditFilesForTable: AuditFile[] = [
    ...auditFiles,
    ...results
      .filter((r) => !auditFiles.some((af) => af.fileName === r.fileName))
      .map(convertToAuditFile)
      .map((af) => {
        // Validación defensiva: asegurar que fecha sea Date | null
        if (af.headers.fecha !== null && !(af.headers.fecha instanceof Date)) {
          console.warn(`⚠️ allAuditFilesForTable: Normalizando fecha inválida para ${af.fileName}`)
          af.headers.fecha = normalizeHeaderDate(af.headers.fecha as string | number | Date | null | undefined)
        }
        return af
      }),
  ]

  const canProcess = selectedSchemaId !== null && selectedMapping !== null && schemaTemplate !== null && files.length > 0 && !isProcessing

  // Función helper para manejar selección de archivos
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      (file) => file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
    )
    
    if (selectedFiles.length > 0) {
      setFiles([...files, ...selectedFiles])
    }
    
    // Reset input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = ""
  }

  // Función helper para formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  // Función helper para remover archivo
  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
  }

  // Obtener lista única de operaciones
  const availableOperations = useMemo(() => {
    const operationsSet = new Set<string>()
    auditFiles.forEach((audit) => {
      const operacion = audit.headers.operacion
      if (operacion) {
        operationsSet.add(String(operacion).trim())
      }
    })
    return Array.from(operationsSet).sort()
  }, [auditFiles])

  // Obtener lista única de operarios
  const availableOperators = useMemo(() => {
    const operatorsSet = new Set<string>()
    auditFiles.forEach((audit) => {
      const operario =
        audit.headers.operario ||
        audit.headers.auditor ||
        audit.headers.responsable ||
        null
      if (operario) {
        operatorsSet.add(String(operario).trim())
      }
    })
    return Array.from(operatorsSet).sort()
  }, [auditFiles])

  // Resetear selecciones cuando cambia el tab de dashboard
  const handleTabChange = (value: string) => {
    setActiveTab(value as "general" | "operation" | "operator")
    if (value === "general") {
      setSelectedOperationId("")
      setSelectedOperatorId("")
    }
  }

  // Determinar si hay datos procesados
  const hasProcessedData = results.length > 0 || auditFiles.length > 0 || vehiculoEventosFiles.length > 0
  
  // Determinar el tipo de datos procesados
  const dataType = vehiculoEventosFiles.length > 0 ? "vehiculos" : auditFiles.length > 0 ? "audit" : results.length > 0 ? "generic" : null

  // Callbacks memorizados para evitar loops infinitos
  // Usar useRef para comparar si las funciones realmente cambiaron
  const prevVehiculoExportFunctionsRef = useRef<typeof vehiculoExportFunctions>(null)
  const handleVehiculoExportFunctionsReady = useCallback((functions: {
    exportPdf: () => Promise<void>
    exportOnePager: () => Promise<void>
    exportSecurityAlert: () => Promise<void>
  }) => {
    // Solo actualizar si las funciones realmente cambiaron
    if (
      !prevVehiculoExportFunctionsRef.current ||
      prevVehiculoExportFunctionsRef.current.exportPdf !== functions.exportPdf ||
      prevVehiculoExportFunctionsRef.current.exportOnePager !== functions.exportOnePager ||
      prevVehiculoExportFunctionsRef.current.exportSecurityAlert !== functions.exportSecurityAlert
    ) {
      prevVehiculoExportFunctionsRef.current = functions
      setVehiculoExportFunctions(functions)
    }
  }, [])

  const prevVehiculoDashboardExportFunctionsRef = useRef<typeof vehiculoDashboardExportFunctions>(null)
  const handleVehiculoDashboardExportFunctionsReady = useCallback((functions: {
    exportPNG: () => Promise<void>
    exportPDF: () => Promise<void>
  }) => {
    // Solo actualizar si las funciones realmente cambiaron
    if (
      !prevVehiculoDashboardExportFunctionsRef.current ||
      prevVehiculoDashboardExportFunctionsRef.current.exportPNG !== functions.exportPNG ||
      prevVehiculoDashboardExportFunctionsRef.current.exportPDF !== functions.exportPDF
    ) {
      prevVehiculoDashboardExportFunctionsRef.current = functions
      setVehiculoDashboardExportFunctions(functions)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* HEADER FIJO SUPERIOR - Configuración */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="space-y-3">
            {/* Título */}
            <div>
              <h1 className="text-lg font-semibold text-foreground">Procesar Archivos Excel</h1>
            </div>

            {/* Selectores de Schema y Mapeo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Selector de Schema */}
              <div className="space-y-1.5">
                <Label htmlFor="schema-select-process" className="text-xs font-medium">
                  Schema
                </Label>
                <Select
                  value={selectedSchemaId || ""}
                  onValueChange={(value) => {
                    setSelectedSchemaId(value)
                    setSelectedMapping(null)
                    setSchemaTemplate(null)
                    setResults([])
                    setAuditFiles([])
                    setVehiculoEventosFiles([])
                  }}
                  disabled={isLoadingSchemas}
                >
                  <SelectTrigger id="schema-select-process" className="w-full">
                    <SelectValue placeholder={isLoadingSchemas ? "Cargando schemas..." : "Seleccionar schema"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSchemas.length === 0 && !isLoadingSchemas && (
                      <SelectItem value="no-schemas" disabled>
                        No hay schemas disponibles
                      </SelectItem>
                    )}
                    {availableSchemas.map((schema) => (
                      <SelectItem key={schema.schemaId} value={schema.schemaId}>
                        {schema.name} ({schema.schemaId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Selector de Mapeo */}
              <div className="space-y-1.5">
                <Label htmlFor="mapping-select-process" className="text-xs font-medium">
                  Mapeo
                </Label>
                <Select
                  value={selectedMapping?.id || ""}
                  onValueChange={(value) => {
                    const mapping = availableMappings.find((m) => m.id === value) || null
                    handleMappingSelect(mapping)
                  }}
                  disabled={!selectedSchemaId || isLoadingMappings}
                >
                  <SelectTrigger id="mapping-select-process" className="w-full">
                    <SelectValue 
                      placeholder={
                        !selectedSchemaId 
                          ? "Seleccioná un schema primero" 
                          : isLoadingMappings 
                          ? "Cargando mapeos..." 
                          : "Seleccionar mapeo"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedSchemaId && (
                      <SelectItem value="no-schema" disabled>
                        Seleccioná un schema primero
                      </SelectItem>
                    )}
                    {selectedSchemaId && availableMappings.length === 0 && !isLoadingMappings && (
                      <SelectItem value="no-mappings" disabled>
                        No hay mapeos guardados para este schema
                      </SelectItem>
                    )}
                    {availableMappings.map((mapping) => (
                      <SelectItem key={mapping.id} value={mapping.id}>
                        {mapping.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMapping && (
                  <p className="text-xs text-muted-foreground">
                    {selectedMapping.headerMappings.length} headers • {selectedMapping.tableMappings.length} columnas
                  </p>
                )}
              </div>
            </div>

            {/* Subida de archivos y estado - Compacto */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {/* Botón de subida de archivos */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload-input-process"
                  disabled={!selectedSchemaId || !selectedMapping}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file-upload-input-process")?.click()}
                  disabled={!selectedSchemaId || !selectedMapping}
                  className="gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Subir archivos
                </Button>

                {/* Estado compacto de archivos */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {error ? (
                    <span className="text-destructive">Error: {error}</span>
                  ) : files.length > 0 ? (
                    <>
                      <span>{files.length} archivo{files.length !== 1 ? "s" : ""} cargado{files.length !== 1 ? "s" : ""}</span>
                      <button
                        type="button"
                        className="text-primary hover:underline cursor-pointer"
                        onClick={() => setShowFilesSheet(true)}
                      >
                        revisar
                      </button>
                    </>
                  ) : (
                    <span>Sin archivos</span>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2 shrink-0">
                {hasProcessedData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFiles([])
                      setResults([])
                      setAuditFiles([])
                      setVehiculoEventosFiles([])
                      setError(null)
                    }}
                  >
                    Reprocesar
                  </Button>
                )}
                <Button 
                  onClick={processFiles} 
                  disabled={!canProcess}
                  size="sm"
                  title={!selectedSchemaId ? "Seleccioná un schema primero" : !selectedMapping ? "Seleccioná un mapeo primero" : files.length === 0 ? "Seleccioná al menos un archivo" : ""}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Procesar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sheet para lista de archivos */}
      <Sheet open={showFilesSheet} onOpenChange={setShowFilesSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Archivos seleccionados</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay archivos seleccionados</p>
            ) : (
              files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-muted rounded-md gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      removeFile(index)
                      if (files.length === 1) {
                        setShowFilesSheet(false)
                      }
                    }}
                    className="h-8 w-8 p-0 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
      {/* CONTENIDO PRINCIPAL - Tabs de visualización */}
      <div className="flex-1 w-full py-6 px-4">
        {hasProcessedData ? (
          <Tabs value={viewTab} onValueChange={(value) => setViewTab(value as "completo" | "dashboard")} className="w-full">
            {/* Toolbar: Tabs + Botón Exportar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="completo">Vista completa</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              </TabsList>
              
              {/* Botón Exportar - Unificado */}
              {dataType === "vehiculos" && (
                viewTab === "completo" && vehiculoExportFunctions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {vehiculoExportFunctions.exportPdf && (
                        <DropdownMenuItem onClick={vehiculoExportFunctions.exportPdf}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Exportar PDF Completo
                        </DropdownMenuItem>
                      )}
                      {vehiculoExportFunctions.exportOnePager && (
                        <DropdownMenuItem onClick={vehiculoExportFunctions.exportOnePager}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Exportar One-Pager PDF
                        </DropdownMenuItem>
                      )}
                      {vehiculoExportFunctions.exportSecurityAlert && (
                        <DropdownMenuItem onClick={vehiculoExportFunctions.exportSecurityAlert}>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Exportar Alerta de Seguridad Vial
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : viewTab === "dashboard" && vehiculoDashboardExportFunctions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {vehiculoDashboardExportFunctions.exportPNG && (
                        <DropdownMenuItem onClick={vehiculoDashboardExportFunctions.exportPNG}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Exportar Imagen (PNG)
                        </DropdownMenuItem>
                      )}
                      {vehiculoDashboardExportFunctions.exportPDF && (
                        <DropdownMenuItem onClick={vehiculoDashboardExportFunctions.exportPDF}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Exportar PDF
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null
              )}
            </div>

            {/* Tab: Vista completa */}
            <TabsContent value="completo" className="space-y-6">
              {dataType === "vehiculos" ? (
                // Para eventos vehiculares, usar EventLogView con tab "completo" y sin tabs internos
                <EventLogView 
                  data={vehiculoEventosFiles} 
                  defaultTab="completo" 
                  hideTabs={true}
                  hideExportButtons={true}
                  onExportFunctionsReady={handleVehiculoExportFunctionsReady}
                />
              ) : dataType === "audit" ? (
                // Para auditorías, mostrar calendario y tabla
                <>
                  <AuditCalendar 
                    auditFiles={auditFiles.map((af) => {
                      // Validación defensiva final antes de pasar a AuditCalendar
                      if (af.headers.fecha !== null && !(af.headers.fecha instanceof Date)) {
                        console.warn(`⚠️ AuditCalendar: Normalizando fecha inválida para ${af.fileName}`)
                        return {
                          ...af,
                          headers: {
                            ...af.headers,
                            fecha: normalizeHeaderDate(af.headers.fecha as string | number | Date | null | undefined),
                          },
                        }
                      }
                      return af
                    })} 
                  />
                  <ResultTable auditResults={allAuditFilesForTable} />
                </>
              ) : (
                // Para datos genéricos
                <ResultTable auditResults={allAuditFilesForTable} />
              )}
            </TabsContent>

            {/* Tab: Dashboard */}
            <TabsContent value="dashboard" className="space-y-6">
              {dataType === "vehiculos" ? (
                // Para eventos vehiculares, usar EventLogView con tab "dashboard" y sin tabs internos
                <EventLogView 
                  data={vehiculoEventosFiles} 
                  defaultTab="dashboard" 
                  hideTabs={true}
                  hideExportButtons={true}
                  onDashboardExportFunctionsReady={handleVehiculoDashboardExportFunctionsReady}
                />
              ) : dataType === "audit" ? (
                // Para auditorías, mostrar tabs de dashboard
                <>
                  {auditFiles.length > 0 && (
                    <AuditCalendar 
                      auditFiles={auditFiles.map((af) => {
                        if (af.headers.fecha !== null && !(af.headers.fecha instanceof Date)) {
                          console.warn(`⚠️ AuditCalendar: Normalizando fecha inválida para ${af.fileName}`)
                          return {
                            ...af,
                            headers: {
                              ...af.headers,
                              fecha: normalizeHeaderDate(af.headers.fecha as string | number | Date | null | undefined),
                            },
                          }
                        }
                        return af
                      })} 
                    />
                  )}
                  
                  {/* Tabs para navegar entre vistas de dashboard */}
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="operation">Por Operación</TabsTrigger>
                      <TabsTrigger value="operator">Por Operario</TabsTrigger>
                    </TabsList>

                    {/* Vista General */}
                    <TabsContent value="general" className="mt-6">
                      {auditFiles.length > 0 ? (
                        <AuditDashboard auditFiles={auditFiles} />
                      ) : (
                        <DashboardGeneral results={results} />
                      )}
                    </TabsContent>

                    {/* Vista Por Operación */}
                    <TabsContent value="operation" className="mt-6">
                      <Card className="p-6 mb-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="operation-select" className="text-base font-semibold">
                              Seleccionar Operación
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Elegí una operación para ver su dashboard detallado
                            </p>
                          </div>
                          <Select
                            value={selectedOperationId}
                            onValueChange={setSelectedOperationId}
                          >
                            <SelectTrigger id="operation-select" className="w-full max-w-md">
                              <SelectValue placeholder="Seleccionar operación..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOperations.length > 0 ? (
                                availableOperations.map((operation) => (
                                  <SelectItem key={operation} value={operation}>
                                    {operation}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>
                                  No hay operaciones disponibles
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>

                      {selectedOperationId ? (
                        <OperationDashboard
                          auditFiles={auditFiles}
                          operationId={selectedOperationId}
                          hideNavigation={true}
                        />
                      ) : (
                        <Card className="p-12">
                          <div className="text-center space-y-2">
                            <p className="text-lg font-medium text-muted-foreground">
                              Seleccioná una operación para ver su dashboard
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {availableOperations.length > 0
                                ? `${availableOperations.length} operación${availableOperations.length !== 1 ? "es" : ""} disponible${availableOperations.length !== 1 ? "s" : ""}`
                                : "No hay operaciones disponibles en los datos procesados"}
                            </p>
                          </div>
                        </Card>
                      )}
                    </TabsContent>

                    {/* Vista Por Operario */}
                    <TabsContent value="operator" className="mt-6">
                      <Card className="p-6 mb-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="operator-select" className="text-base font-semibold">
                              Seleccionar Operario
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Elegí un operario para ver su dashboard detallado
                            </p>
                          </div>
                          <Select
                            value={selectedOperatorId}
                            onValueChange={setSelectedOperatorId}
                          >
                            <SelectTrigger id="operator-select" className="w-full max-w-md">
                              <SelectValue placeholder="Seleccionar operario..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOperators.length > 0 ? (
                                availableOperators.map((operator) => (
                                  <SelectItem key={operator} value={operator}>
                                    {operator}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>
                                  No hay operarios disponibles
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>

                      {selectedOperatorId ? (
                        <OperatorDashboard
                          auditFiles={auditFiles}
                          operatorId={selectedOperatorId}
                          hideNavigation={true}
                        />
                      ) : (
                        <Card className="p-12">
                          <div className="text-center space-y-2">
                            <p className="text-lg font-medium text-muted-foreground">
                              Seleccioná un operario para ver su dashboard
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {availableOperators.length > 0
                                ? `${availableOperators.length} operario${availableOperators.length !== 1 ? "s" : ""} disponible${availableOperators.length !== 1 ? "s" : ""}`
                                : "No hay operarios disponibles en los datos procesados"}
                            </p>
                          </div>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                // Para datos genéricos
                <DashboardGeneral results={results} />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // Estado inicial: sin datos procesados
          <Card className="p-12">
            <div className="text-center space-y-4">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-foreground">
                  No hay datos procesados todavía
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Configurá el schema y mapeo en el header superior, subí archivos Excel y procesalos para ver los resultados aquí.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

