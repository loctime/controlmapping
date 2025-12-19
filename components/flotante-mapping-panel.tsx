"use client"

import { useRef, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ExcelData, SchemaTemplate, SchemaFieldMapping } from "@/types/excel"

type MappingMode = "idle" | "mappingHeader" | "mappingTable"

interface FloatingMappingPanelProps {
  excelData?: ExcelData | null
  selectedCell: string | null

  schemaTemplate: SchemaTemplate
  headerMappings: SchemaFieldMapping[]
  tableMappings: SchemaFieldMapping[]

  currentHeaderFieldIndex: number
  setCurrentHeaderFieldIndex: (index: number) => void

  currentTableFieldIndex: number
  setCurrentTableFieldIndex: (index: number) => void

  draftCellOrColumn: string | null
  setDraftCellOrColumn: (cellOrColumn: string | null) => void

  onHeaderFieldMapped: (role: string, cell: string) => void
  onTableFieldMapped: (role: string, column: string) => void
}

export function FloatingMappingPanel({
  excelData,
  selectedCell,
  schemaTemplate,
  headerMappings,
  tableMappings,
  currentHeaderFieldIndex,
  setCurrentHeaderFieldIndex,
  currentTableFieldIndex,
  setCurrentTableFieldIndex,
  draftCellOrColumn,
  setDraftCellOrColumn,
  onHeaderFieldMapped,
  onTableFieldMapped,
}: FloatingMappingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState({ x: 24, y: 96 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const posRef = useRef({ x: 24, y: 96 })

  const getCellValue = (cellId: string | null) => {
    if (!cellId || !excelData) return ""
    return excelData.sheets[0]?.cells[cellId]?.value ?? ""
  }

  // Formatea numérico porcentual sólo para la visualización
  const renderValue = (val: any) => {
    if (typeof val === 'number' && Math.abs(val) > 0 && Math.abs(val) < 1) {
      return (val * 100).toFixed(2).replace(/\.?0+$/, '') + '%'
    }
    return String(val)
  }

  // Determinar el modo actual basado en qué fase estamos
  const mode: MappingMode = 
    currentHeaderFieldIndex < schemaTemplate.headerFields.length 
      ? "mappingHeader" 
      : currentTableFieldIndex < schemaTemplate.table.columns.length
      ? "mappingTable"
      : "idle"

  // Obtener el campo actual que se está mapeando
  const currentHeaderField = schemaTemplate.headerFields[currentHeaderFieldIndex]
  const currentTableField = schemaTemplate.table.columns[currentTableFieldIndex]

  // Extraer columna de una referencia de celda (e.g. "B2" -> "B")
  const extractColumn = (cellRef: string): string => {
    return cellRef.replace(/[0-9]/g, '')
  }

  // Reaccionar al click en el Excel según el paso
  useEffect(() => {
    if (!selectedCell) return

    if (mode === "mappingHeader") {
      setDraftCellOrColumn(selectedCell)
    } else if (mode === "mappingTable") {
      // Para columnas, extraer la letra de la columna
      const column = extractColumn(selectedCell)
      setDraftCellOrColumn(column)
    }
  }, [selectedCell, mode, setDraftCellOrColumn])

  // Sincronizar refs con estado
  useEffect(() => {
    draggingRef.current = dragging
  }, [dragging])

  useEffect(() => {
    posRef.current = pos
  }, [pos])

  const onMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true
    setDragging(true)
    dragOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current) return
    setPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    })
  }

  const onMouseUp = () => {
    draggingRef.current = false
    setDragging(false)
  }

  // drag global - solo se registra una vez
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  const handleConfirmHeaderMapping = () => {
    if (!draftCellOrColumn || !currentHeaderField) return
    onHeaderFieldMapped(currentHeaderField.role, draftCellOrColumn)
    setDraftCellOrColumn(null)
    setCurrentHeaderFieldIndex(currentHeaderFieldIndex + 1)
  }

  const handleConfirmTableMapping = () => {
    if (!draftCellOrColumn || !currentTableField) return
    onTableFieldMapped(currentTableField.role, draftCellOrColumn)
    setDraftCellOrColumn(null)
    setCurrentTableFieldIndex(currentTableFieldIndex + 1)
  }

  const handleSkipHeaderField = () => {
    if (!currentHeaderField) return
    // Solo permitir saltar si no es requerido
    if (!currentHeaderField.required) {
      setCurrentHeaderFieldIndex(currentHeaderFieldIndex + 1)
      setDraftCellOrColumn(null)
    }
  }

  const handleSkipTableField = () => {
    if (!currentTableField) return
    // Solo permitir saltar si no es requerido
    if (!currentTableField.required) {
      setCurrentTableFieldIndex(currentTableFieldIndex + 1)
      setDraftCellOrColumn(null)
    }
  }

  // Calcular progreso
  const totalFields = schemaTemplate.headerFields.length + schemaTemplate.table.columns.length
  const mappedFields = headerMappings.length + tableMappings.length
  const overallProgress = totalFields > 0 ? (mappedFields / totalFields) * 100 : 0

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: pos.y,
        left: pos.x,
        zIndex: 50,
      }}
      className="select-none border border-border rounded-lg"
    >
      <Card className="w-[320px] shadow-2xl border bg-muted/95 backdrop-blur-sm p-0">
        {/* HEADER DRAG */}
        <div
          onMouseDown={onMouseDown}
          className="cursor-move px-3 py-2 border-b bg-primary text-primary-foreground font-medium text-sm"
        >
          🧩 Mapeo de campos
        </div>

        <div className="px-3 py-2 space-y-2">
          {/* Barra de progreso */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progreso general</span>
              <span className="font-medium">{mappedFields}/{totalFields}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Mapeo de Header Fields */}
          {mode === "mappingHeader" && currentHeaderField && (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                <p className="text-xs text-foreground">
                  <b>Fase 1:</b> Campos del encabezado ({currentHeaderFieldIndex + 1}/{schemaTemplate.headerFields.length})
                </p>
              </div>

              <div className="space-y-2 p-2 bg-muted/50 rounded-md">
                <div>
                  <p className="text-xs font-medium text-foreground mb-0.5">
                    {currentHeaderField.label}
                    {currentHeaderField.required && <span className="text-destructive ml-1">*</span>}
                  </p>
                  {currentHeaderField.description && (
                    <p className="text-xs text-muted-foreground">{currentHeaderField.description}</p>
                  )}
                </div>

                {draftCellOrColumn ? (
                  <Badge variant="outline" className="bg-white shadow-sm border-border/50 font-mono text-xs">
                    {draftCellOrColumn} → {renderValue(getCellValue(draftCellOrColumn))}
                  </Badge>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    Seleccioná la celda en el Excel que contiene este dato
                  </p>
                )}
              </div>

              <div className="flex gap-1.5 pt-1">
                <Button
                  disabled={!draftCellOrColumn}
                  className="flex-1 h-8 text-sm"
                  onClick={handleConfirmHeaderMapping}
                >
                  Confirmar
                </Button>
                {!currentHeaderField.required && (
                  <Button 
                    variant="outline" 
                    className="h-8 text-sm" 
                    onClick={handleSkipHeaderField}
                  >
                    Omitir
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Mapeo de Table Columns */}
          {mode === "mappingTable" && currentTableField && (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
                <p className="text-xs text-foreground">
                  <b>Fase 2:</b> Columnas de la tabla ({currentTableFieldIndex + 1}/{schemaTemplate.table.columns.length})
                </p>
              </div>

              <div className="space-y-2 p-2 bg-muted/50 rounded-md">
                <div>
                  <p className="text-xs font-medium text-foreground mb-0.5">
                    {currentTableField.label}
                    {currentTableField.required && <span className="text-destructive ml-1">*</span>}
                  </p>
                  {currentTableField.description && (
                    <p className="text-xs text-muted-foreground">{currentTableField.description}</p>
                  )}
                </div>

                {draftCellOrColumn ? (
                  <Badge variant="outline" className="bg-white shadow-sm border-border/50 font-mono text-xs">
                    Columna {draftCellOrColumn}
                  </Badge>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    Seleccioná cualquier celda de la columna en el Excel
                  </p>
                )}
              </div>

              <div className="flex gap-1.5 pt-1">
                <Button
                  disabled={!draftCellOrColumn}
                  className="flex-1 h-8 text-sm"
                  onClick={handleConfirmTableMapping}
                >
                  Confirmar
                </Button>
                {!currentTableField.required && (
                  <Button 
                    variant="outline" 
                    className="h-8 text-sm" 
                    onClick={handleSkipTableField}
                  >
                    Omitir
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Completado */}
          {mode === "idle" && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
              <p className="text-xs text-foreground">
                ✅ Mapeo completado
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
