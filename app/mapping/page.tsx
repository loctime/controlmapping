"use client"

import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { FileUploadZone } from "@/components/file-upload-zone"
import { ExcelViewerFidel } from "@/components/excel-viewer-fidel"
import { FloatingMappingPanel } from "@/components/flotante-mapping-panel"
import { Header } from "@/components/header"
import { MultiFileUpload } from "@/components/multi-file-upload"
import { ResultTable } from "@/components/result-table"
import { saveSchemaTemplate, getSchemaTemplates, getSchemaTemplate } from "@/lib/firebase"
import { parseAudit, type AuditFile } from "@/domains/audit"
import type { CellMapping, ExcelData, SchemaTemplate, SchemaInstance, SchemaFieldMapping } from "@/types/excel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

// Schema Template de Auditoría
const AUDIT_SCHEMA_TEMPLATE: SchemaTemplate = {
  schemaId: "audit-standard-v1",
  name: "Auditoría estándar",
  description: "Schema base para auditorías de higiene, seguridad u operativas",
  version: 1,
  type: "audit",
  headerFields: [
    {
      role: "operacion",
      label: "Operación",
      required: true,
      description: "Nombre o identificación de la operación auditada"
    },
    {
      role: "responsable_operacion",
      label: "Responsable de la operación",
      required: false
    },
    {
      role: "cliente",
      label: "Cliente",
      required: true
    },
    {
      role: "fecha",
      label: "Fecha de auditoría",
      required: true,
      dataType: "date"
    },
    {
      role: "auditor",
      label: "Auditor",
      required: true
    },
    {
      role: "cantidad_items",
      label: "Cantidad de ítems",
      required: true,
      dataType: "number"
    },
    {
      role: "cantidad_cumple",
      label: "Cantidad Cumple",
      required: false,
      dataType: "number",
      description: "Cantidad total de ítems que cumplen (valor final desde Excel)"
    },
    {
      role: "cantidad_cumple_parcial",
      label: "Cantidad Cumple Parcial",
      required: false,
      dataType: "number",
      description: "Cantidad total de ítems que cumplen parcialmente (valor final desde Excel)"
    },
    {
      role: "cantidad_no_cumple",
      label: "Cantidad No Cumple",
      required: false,
      dataType: "number",
      description: "Cantidad total de ítems que no cumplen (valor final desde Excel)"
    },
    {
      role: "cantidad_no_aplica",
      label: "Cantidad No Aplica",
      required: false,
      dataType: "number",
      description: "Cantidad total de ítems que no aplican (valor final desde Excel)"
    },
    {
      role: "cumplimiento_total_pct",
      label: "% de cumplimiento total",
      required: true,
      dataType: "percentage"
    },
    {
      role: "puntos_obtenidos",
      label: "Puntos obtenidos",
      required: false,
      dataType: "number"
    },
    {
      role: "porcentaje_cumple",
      label: "% Cumple",
      required: false,
      dataType: "percentage"
    },
    {
      role: "porcentaje_cumple_parcial",
      label: "% Cumple Parcial",
      required: false,
      dataType: "percentage"
    },
    {
      role: "porcentaje_no_cumple",
      label: "% No cumple",
      required: false,
      dataType: "percentage"
    },
    {
      role: "porcentaje_no_aplica",
      label: "% No aplica",
      required: false,
      dataType: "percentage"
    }
  ],
  table: {
    description: "Tabla principal de preguntas / ítems auditados",
    columns: [
      {
        role: "pregunta",
        label: "Pregunta / Ítem",
        required: true,
        dataType: "string"
      },
      {
        role: "cumple",
        label: "Cumple",
        required: false,
        dataType: "boolean"
      },
      {
        role: "cumple_parcial",
        label: "Cumple parcial",
        required: false,
        dataType: "boolean"
      },
      {
        role: "no_cumple",
        label: "No cumple",
        required: false,
        dataType: "boolean"
      },
      {
        role: "no_aplica",
        label: "No aplica",
        required: false,
        dataType: "boolean"
      },
      {
        role: "observaciones",
        label: "Observaciones",
        required: false,
        dataType: "string"
      }
    ]
  }
}

export default function MappingPage() {
  const [excelData, setExcelData] = useState<ExcelData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mappings, setMappings] = useState<CellMapping[]>([]) // Mantener para compatibilidad con ExcelViewerFidel
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [isMappingPanelOpen, setIsMappingPanelOpen] = useState(false)
  
  // Schema selection
  const [availableSchemas, setAvailableSchemas] = useState<SchemaTemplate[]>([])
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null)
  const [schemaTemplate, setSchemaTemplate] = useState<SchemaTemplate | null>(null)
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(true)
  
  const [headerMappings, setHeaderMappings] = useState<SchemaFieldMapping[]>([])
  const [tableMappings, setTableMappings] = useState<SchemaFieldMapping[]>([])
  const [currentHeaderFieldIndex, setCurrentHeaderFieldIndex] = useState(0)
  const [currentTableFieldIndex, setCurrentTableFieldIndex] = useState(0)
  const [draftCellOrColumn, setDraftCellOrColumn] = useState<string | null>(null)
  
  // Estados para procesamiento de auditorías
  const [auditFiles, setAuditFiles] = useState<File[]>([])
  const [auditResults, setAuditResults] = useState<AuditFile[]>([])
  const [isProcessingAudits, setIsProcessingAudits] = useState(false)
  const [showAuditResults, setShowAuditResults] = useState(false)

  // Cargar schemas disponibles al montar
  useEffect(() => {
    const loadSchemas = async () => {
      setIsLoadingSchemas(true)
      try {
        // Guardar schemas conocidos primero (para asegurar que estén disponibles)
        await saveSchemaTemplate(AUDIT_SCHEMA_TEMPLATE).catch((err) => {
          console.error("Error al guardar SchemaTemplate de auditoría:", err)
        })
        
        // Importar y guardar schema de vehículos
        const { VEHICULO_EVENTOS_V1_SCHEMA } = await import("@/domains/vehiculo/config")
        await saveSchemaTemplate(VEHICULO_EVENTOS_V1_SCHEMA).catch((err) => {
          console.error("Error al guardar SchemaTemplate de vehículos:", err)
        })
        
        // Cargar todos los schemas disponibles
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
          // Resetear mapeos cuando cambia el schema
          setHeaderMappings([])
          setTableMappings([])
          setCurrentHeaderFieldIndex(0)
          setCurrentTableFieldIndex(0)
          setExcelData(null) // Limpiar Excel cuando cambia el schema
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

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellStyles: true,
        cellHTML: false,
      })

      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")

      // Función auxiliar para convertir color Excel a hex
      const excelColorToHex = (color: any): string | undefined => {
        if (!color) return undefined
        
        // Formato RGB directo
        if (color.rgb) {
          let rgb = color.rgb.toString().toUpperCase()
          // El RGB puede venir en formato AARRGGBB o RRGGBB
          if (rgb.length === 8) {
            // AARRGGBB, tomar solo RRGGBB (ignorar alpha)
            rgb = rgb.substring(2)
          }
          // Asegurar que tenga 6 caracteres
          if (rgb.length === 6) {
            return `#${rgb}`
          }
        }
        
        // Formato indexed (colores indexados de Excel)
        if (color.indexed !== undefined) {
          // Mapeo de algunos colores indexados comunes
          const indexedColors: Record<number, string> = {
            1: "#000000", // Negro
            2: "#FFFFFF", // Blanco
            3: "#FF0000", // Rojo
            4: "#00FF00", // Verde
            5: "#0000FF", // Azul
            6: "#FFFF00", // Amarillo
            7: "#FF00FF", // Magenta
            8: "#00FFFF", // Cyan
          }
          return indexedColors[color.indexed]
        }
        
        // Manejo de temas de Excel (simplificado)
        if (color.theme !== undefined) {
          // Los temas requieren el workbook.Theme que es complejo
          // Por ahora retornamos undefined para que use el default
          return undefined
        }
        
        return undefined
      }

      // Función auxiliar para extraer bordes
      const extractBorders = (cell: XLSX.CellObject) => {
        const borders: any = {}
        const cellStyle = cell.s

        if (cellStyle?.border) {
          const b = cellStyle.border
          
          if (b.top) {
            const color = excelColorToHex(b.top.color)
            const style = b.top.style || "thin"
            const width = style === "thick" ? "3px" : style === "medium" ? "2px" : "1px"
            borders.borderTop = `${width} solid ${color}`
          }
          
          if (b.right) {
            const color = excelColorToHex(b.right.color)
            const style = b.right.style || "thin"
            const width = style === "thick" ? "3px" : style === "medium" ? "2px" : "1px"
            borders.borderRight = `${width} solid ${color}`
          }
          
          if (b.bottom) {
            const color = excelColorToHex(b.bottom.color)
            const style = b.bottom.style || "thin"
            const width = style === "thick" ? "3px" : style === "medium" ? "2px" : "1px"
            borders.borderBottom = `${width} solid ${color}`
          }
          
          if (b.left) {
            const color = excelColorToHex(b.left.color)
            const style = b.left.style || "thin"
            const width = style === "thick" ? "3px" : style === "medium" ? "2px" : "1px"
            borders.borderLeft = `${width} solid ${color}`
          }
        }

        return borders
      }

      const cells: Record<string, any> = {}
      const merges: string[] = []
      const cellPositions: Record<string, any> = {}

      // Procesar merges
      if (worksheet["!merges"]) {
        worksheet["!merges"].forEach((merge: XLSX.Range) => {
          const start = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })
          const end = XLSX.utils.encode_cell({ r: merge.e.r, c: merge.e.c })
          merges.push(`${start}:${end}`)
        })
      }

      // Función para verificar si una celda está en un merge
      const isCellInMerge = (row: number, col: number): { isMerged: boolean; mergeRange?: string; isFirstCell?: boolean } => {
        if (!worksheet["!merges"]) return { isMerged: false }
        
        for (const merge of worksheet["!merges"]) {
          if (row >= merge.s.r && row <= merge.e.r && col >= merge.s.c && col <= merge.e.c) {
            const start = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })
            const end = XLSX.utils.encode_cell({ r: merge.e.r, c: merge.e.c })
            return {
              isMerged: true,
              mergeRange: `${start}:${end}`,
              isFirstCell: row === merge.s.r && col === merge.s.c,
            }
          }
        }
        return { isMerged: false }
      }

      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
          const cell = worksheet[cellAddress]
          const mergeInfo = isCellInMerge(R, C)

          // Solo procesar la primera celda del merge o celdas no mergeadas
          if (cell || mergeInfo.isFirstCell) {
            const cellData = cell || worksheet[mergeInfo.mergeRange?.split(":")[0] || cellAddress]
            
            if (cellData) {
              const style = cellData.s || {}
              const font = style.font || {}
              const fill = style.fill || {}
              const alignment = style.alignment || {}
              
              // Extraer valor formateado
              let cellValue: string | number = ""
              if (cellData.v !== undefined && cellData.v !== null) {
                if (cellData.t === "n") {
                  cellValue = cellData.v as number
                } else if (cellData.t === "b") {
                  cellValue = cellData.v ? "TRUE" : "FALSE"
                } else {
                  cellValue = String(cellData.v)
                }
              }

              // Extraer estilos completos
              const borders = extractBorders(cellData)
              
              // Extraer color de fondo
              let backgroundColor: string | undefined = undefined
              if (fill) {
                // En Excel, fgColor es el color de primer plano (el que se ve)
                if (fill.fgColor) {
                  const bgColor = excelColorToHex(fill.fgColor)
                  if (bgColor) backgroundColor = bgColor
                }
                // Si no hay fgColor pero hay pattern solid, usar bgColor como fallback
                if (!backgroundColor && fill.patternType === "solid" && fill.bgColor) {
                  const bgColor = excelColorToHex(fill.bgColor)
                  if (bgColor) backgroundColor = bgColor
                }
                // Si hay pattern pero no colores específicos, puede ser un fill sólido sin color (usar blanco/transparente)
              }
              
              // Extraer color de texto
              const textColor = excelColorToHex(font.color)
              
              // Debug deshabilitado para mejor rendimiento
              
              const cellStyle: any = {
                // Fuente
                fontFamily: font.name,
                fontSize: font.sz ? `${font.sz}pt` : undefined,
                fontWeight: font.bold ? "bold" : undefined,
                fontStyle: font.italic ? "italic" : undefined,
                color: textColor,
                underline: font.underline ? true : undefined,
                
                // Fondo (solo si existe)
                ...(backgroundColor && { backgroundColor }),
                
                // Bordes
                ...borders,
                
                // Alineación
                textAlign: alignment.horizontal,
                verticalAlign: alignment.vertical,
                wrapText: alignment.wrapText || false,
                ...(alignment.textRotation && { textRotation: alignment.textRotation }),
              }

              // Limpiar propiedades undefined (mantener las que tienen valor)
              Object.keys(cellStyle).forEach(key => {
                if (cellStyle[key] === undefined || cellStyle[key] === null) {
                  delete cellStyle[key]
                }
              })

              cells[cellAddress] = {
                value: cellValue,
                style: cellStyle,
                isMerged: mergeInfo.isMerged,
                mergeRange: mergeInfo.mergeRange,
              }
            }
          }
        }
      }

      // Generar HTML fiel usando sheet_to_html
      const html = XLSX.utils.sheet_to_html(worksheet, {
        id: "excel-table",
        editable: false,
      })

      const excelData: ExcelData = {
        fileName: file.name,
        sheets: [
          {
            name: firstSheetName,
            rows: range.e.r + 1,
            cols: range.e.c + 1,
            cells,
            merges,
            html,
            cellPositions,
          },
        ],
      }

      setExcelData(excelData)
      setIsLoading(false)
      setIsMappingPanelOpen(true) // Abrir panel automáticamente al cargar
    } catch (error) {
      console.error("Error al procesar Excel:", error)
      setIsLoading(false)
      alert("Error al procesar el archivo Excel. Por favor, intenta con otro archivo.")
    }
  }

  const handleCellSelect = (cellId: string) => {
    setSelectedCell(cellId)
    setIsMappingPanelOpen(true) // Abrir panel cuando se selecciona una celda
  }

  const handleHeaderFieldMapped = (role: string, cell: string) => {
    setHeaderMappings(prev => [
      ...prev,
      {
        role,
        cellOrColumn: cell,
        isColumn: false,
      }
    ])
  }

  const handleTableFieldMapped = (role: string, column: string) => {
    setTableMappings(prev => [
      ...prev,
      {
        role,
        cellOrColumn: column,
        isColumn: true,
      }
    ])
  }

  const handleRemoveLastHeaderMapping = () => {
    setHeaderMappings(prev => prev.slice(0, -1))
  }

  const handleRemoveLastTableMapping = () => {
    setTableMappings(prev => prev.slice(0, -1))
  }

  const handleCreateMapping = (mapping: Omit<CellMapping, "id" | "createdAt">) => {
    // Mantener para compatibilidad, pero ya no se usa con schema templates
    setMappings(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        ...mapping,
      },
    ])
  }

  const handleRemoveMapping = (id: string) => {
    setMappings(mappings.filter((m) => m.id !== id))
  }

  const handleSaveSchema = () => {
    if (!excelData) return

    const schemaInstance: SchemaInstance = {
      schemaId: schemaTemplate.schemaId,
      schemaVersion: schemaTemplate.version,
      fileName: excelData.fileName,
      headerMappings,
      tableMappings,
      createdAt: new Date(),
    }

    console.log("Schema instance guardado:", schemaInstance)
    const blob = new Blob([JSON.stringify(schemaInstance, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `schema-instance-${Date.now()}.json`
    a.click()
  }

  // Función para leer un archivo Excel y convertirlo a ExcelData (versión simplificada sin estilos)
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

    const cells: Record<string, { value: string | number }> = {}

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

  // Función para procesar auditorías usando el parser
  const handleProcessAudits = async () => {
    if (auditFiles.length === 0) {
      alert("Por favor seleccioná al menos un archivo Excel para procesar")
      return
    }

    if (headerMappings.length === 0 && tableMappings.length === 0) {
      alert("Por favor completá el mapeo antes de procesar auditorías")
      return
    }

    setIsProcessingAudits(true)
    setAuditResults([])
    setShowAuditResults(false)

    try {
      // Construir el SchemaInstance actual
      const schemaInstance: SchemaInstance = {
        schemaId: schemaTemplate.schemaId,
        schemaVersion: schemaTemplate.version,
        fileName: "", // No importa para procesamiento
        headerMappings: [...headerMappings],
        tableMappings: [...tableMappings],
        createdAt: new Date(),
      }

      const results: AuditFile[] = []
      const errors: string[] = []

      // Procesar cada archivo
      for (let i = 0; i < auditFiles.length; i++) {
        const file = auditFiles[i]
        try {
          console.log(`Procesando archivo ${i + 1}/${auditFiles.length}: ${file.name}`)
          
          // Leer el archivo Excel
          const excelData = await readExcelFile(file)
          
          // Parsear usando el parser
          const auditFile = parseAudit(excelData, schemaTemplate, schemaInstance)
          
          results.push(auditFile)
          console.log(`✅ Archivo procesado: ${file.name}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido"
          console.error(`❌ Error al procesar ${file.name}:`, errorMessage)
          errors.push(`${file.name}: ${errorMessage}`)
          // Continuar con el siguiente archivo sin romper el proceso
        }
      }

      if (results.length > 0) {
        setAuditResults(results)
        setShowAuditResults(true)
        
        if (errors.length > 0) {
          alert(`Se procesaron ${results.length} archivo(s) correctamente.\n\nErrores:\n${errors.join("\n")}`)
        }
      } else {
        alert(`No se pudo procesar ningún archivo.\n\nErrores:\n${errors.join("\n")}`)
      }
    } catch (error) {
      console.error("Error al procesar auditorías:", error)
      alert(`Error al procesar auditorías: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsProcessingAudits(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        fileName={excelData?.fileName}
        mappingsCount={headerMappings.length + tableMappings.length}
        onSaveSchema={handleSaveSchema}
        onReset={() => {
          setExcelData(null)
          setMappings([])
          setSelectedCell(null)
          setIsMappingPanelOpen(false)
          setHeaderMappings([])
          setTableMappings([])
          setCurrentHeaderFieldIndex(0)
          setCurrentTableFieldIndex(0)
          setDraftCellOrColumn(null)
          setAuditFiles([])
          setAuditResults([])
          setShowAuditResults(false)
        }}
        onToggleMappingPanel={() => setIsMappingPanelOpen(!isMappingPanelOpen)}
        isMappingPanelOpen={isMappingPanelOpen}
        zoom={zoom}
        onZoomChange={setZoom}
        onLoadTemplate={(tplMappings) => {
          // replace current mappings with the template's mappings
          setMappings(tplMappings)
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {!excelData ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
            {/* Selector de Schema */}
            <Card className="p-6 w-full max-w-md">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="schema-select" className="text-base font-semibold">
                    Schema
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seleccioná el schema que querés usar para mapear tu Excel
                  </p>
                </div>
                <Select
                  value={selectedSchemaId || ""}
                  onValueChange={setSelectedSchemaId}
                  disabled={isLoadingSchemas}
                >
                  <SelectTrigger id="schema-select" className="w-full">
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
                {selectedSchemaId && schemaTemplate && (
                  <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
                    <p>
                      <span className="font-medium">Descripción:</span> {schemaTemplate.description || "Sin descripción"}
                    </p>
                    <p>
                      <span className="font-medium">Versión:</span> {schemaTemplate.version}
                    </p>
                    <p>
                      <span className="font-medium">Tipo:</span> {schemaTemplate.type}
                    </p>
                  </div>
                )}
                {!selectedSchemaId && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Seleccioná un schema para comenzar
                  </p>
                )}
              </div>
            </Card>
            
            {/* Zona de carga de archivo - deshabilitada si no hay schema */}
            <div className="w-full max-w-md">
              <FileUploadZone 
                onFileSelect={handleFileUpload} 
                isLoading={isLoading}
                disabled={!selectedSchemaId || !schemaTemplate}
              />
              {!selectedSchemaId && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Seleccioná un schema para habilitar la carga de archivos
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {showAuditResults ? (
              /* Vista de resultados consolidados */
              <div className="flex-1 overflow-auto p-4">
                <ResultTable auditResults={auditResults} />
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAuditResults(false)
                      setAuditResults([])
                    }}
                  >
                    Volver al mapeo
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Excel Viewer - Ocupa todo el espacio disponible */}
                <div className="flex-1 overflow-hidden min-h-0 relative">
                  <ExcelViewerFidel
                    data={excelData}
                    mappings={mappings}
                    selectedCell={selectedCell}
                    onCellSelect={handleCellSelect}
                    zoom={zoom}
                    onZoomChange={setZoom}
                  />
                </div>
                
                {/* Panel flotante de mapeo */}
                {schemaTemplate && (
                  <FloatingMappingPanel
                    excelData={excelData}
                    selectedCell={selectedCell}
                    schemaTemplate={schemaTemplate}
                  headerMappings={headerMappings}
                  tableMappings={tableMappings}
                  currentHeaderFieldIndex={currentHeaderFieldIndex}
                  setCurrentHeaderFieldIndex={setCurrentHeaderFieldIndex}
                  currentTableFieldIndex={currentTableFieldIndex}
                  setCurrentTableFieldIndex={setCurrentTableFieldIndex}
                  draftCellOrColumn={draftCellOrColumn}
                  setDraftCellOrColumn={setDraftCellOrColumn}
                  onHeaderFieldMapped={handleHeaderFieldMapped}
                  onTableFieldMapped={handleTableFieldMapped}
                  onRemoveLastHeaderMapping={handleRemoveLastHeaderMapping}
                  onRemoveLastTableMapping={handleRemoveLastTableMapping}
                  />
                )}
                
                {/* Panel de procesamiento de auditorías */}
                <div className="border-t border-border bg-card p-4">
                  <div className="max-w-4xl mx-auto space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Procesar auditorías
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Subí uno o varios archivos Excel con el mismo formato y procesalos usando el mapeo actual
                      </p>
                    </div>
                    
                    <MultiFileUpload files={auditFiles} onFilesChange={setAuditFiles} />
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {auditFiles.length > 0 && (
                          <span>
                            {auditFiles.length} archivo{auditFiles.length !== 1 ? "s" : ""} seleccionado{auditFiles.length !== 1 ? "s" : ""}
                            {headerMappings.length + tableMappings.length > 0 && (
                              <span className="ml-2">
                                • {headerMappings.length + tableMappings.length} campo{headerMappings.length + tableMappings.length !== 1 ? "s" : ""} mapeado{headerMappings.length + tableMappings.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={handleProcessAudits}
                        disabled={auditFiles.length === 0 || isProcessingAudits || (headerMappings.length === 0 && tableMappings.length === 0)}
                      >
                        {isProcessingAudits ? "Procesando..." : "Procesar auditorías"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
