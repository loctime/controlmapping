"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { FileUploadZone } from "@/components/file-upload-zone"
import { ExcelViewerFidel } from "@/components/excel-viewer-fidel"
import { MappingPanel } from "@/components/mapping-panel"
import { Header } from "@/components/header"
import type { CellMapping, ExcelData } from "@/types/excel"

export default function Home() {
  const [excelData, setExcelData] = useState<ExcelData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mappings, setMappings] = useState<CellMapping[]>([])
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [isMappingPanelOpen, setIsMappingPanelOpen] = useState(false)

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

  const handleAddMapping = (label: string) => {
    if (!selectedCell) return

    const newMapping: CellMapping = {
      id: Date.now().toString(),
      cellId: selectedCell,
      label,
      createdAt: new Date(),
    }

    setMappings([...mappings, newMapping])
    setSelectedCell(null)
  }

  const handleRemoveMapping = (id: string) => {
    setMappings(mappings.filter((m) => m.id !== id))
  }

  const handleSaveSchema = () => {
    const schema = {
      fileName: excelData?.fileName,
      mappings: mappings.map((m) => ({
        cellId: m.cellId,
        label: m.label,
      })),
      savedAt: new Date(),
    }

    console.log("Schema guardado:", schema)
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mapping-schema-${Date.now()}.json`
    a.click()
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        fileName={excelData?.fileName}
        mappingsCount={mappings.length}
        onSaveSchema={handleSaveSchema}
        onReset={() => {
          setExcelData(null)
          setMappings([])
          setSelectedCell(null)
          setIsMappingPanelOpen(false)
        }}
        onToggleMappingPanel={() => setIsMappingPanelOpen(!isMappingPanelOpen)}
        isMappingPanelOpen={isMappingPanelOpen}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <div className="flex-1 flex overflow-hidden">
        {!excelData ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <FileUploadZone onFileSelect={handleFileUpload} isLoading={isLoading} />
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
            
            {/* Mapping Panel como sidebar lateral */}
            <MappingPanel
              selectedCell={selectedCell}
              mappings={mappings}
              onAddMapping={handleAddMapping}
              onRemoveMapping={handleRemoveMapping}
              isOpen={isMappingPanelOpen}
              onOpenChange={setIsMappingPanelOpen}
            />
          </>
        )}
      </div>
    </div>
  )
}
