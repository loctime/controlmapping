"use client"

import { useRef, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { saveMapping } from "@/lib/firebase"
import type { ExcelData, SchemaTemplate, SchemaFieldMapping, SchemaInstance } from "@/types/excel"

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
  onRemoveLastHeaderMapping: () => void
  onRemoveLastTableMapping: () => void
  onSave?: (instance: SchemaInstance) => void
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
  onRemoveLastHeaderMapping,
  onRemoveLastTableMapping,
  onSave,
}: FloatingMappingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState({ x: 24, y: 96 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const posRef = useRef({ x: 24, y: 96 })
  const lastProcessedCellRef = useRef<string | null>(null)
  const [showAllMappedFields, setShowAllMappedFields] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [mappingName, setMappingName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [fastMode, setFastMode] = useState(false)

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

  // Modo veloz: confirmar automáticamente cuando se selecciona una celda en headerFields
  useEffect(() => {
    if (fastMode && mode === "mappingHeader" && draftCellOrColumn && currentHeaderField) {
      // Evitar procesar la misma celda múltiples veces
      if (lastProcessedCellRef.current === draftCellOrColumn) {
        return
      }
      lastProcessedCellRef.current = draftCellOrColumn
      
      // Confirmar automáticamente y avanzar al siguiente campo
      onHeaderFieldMapped(currentHeaderField.role, draftCellOrColumn)
      setDraftCellOrColumn(null)
      setCurrentHeaderFieldIndex(currentHeaderFieldIndex + 1)
    } else if (draftCellOrColumn === null) {
      // Resetear el ref cuando draftCellOrColumn se limpia
      lastProcessedCellRef.current = null
    }
  }, [fastMode, mode, draftCellOrColumn, currentHeaderField, currentHeaderFieldIndex, onHeaderFieldMapped, setDraftCellOrColumn, setCurrentHeaderFieldIndex])

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

  // Funciones para volver al paso anterior con rollback real
  const handleGoBackHeader = () => {
    if (currentHeaderFieldIndex > 0) {
      // El índice actual indica cuántos campos hemos confirmado
      // Si estamos en índice N, significa que hemos confirmado N campos
      // Al retroceder, eliminamos el último mapping confirmado
      if (headerMappings.length > 0 && headerMappings.length === currentHeaderFieldIndex) {
        onRemoveLastHeaderMapping()
      }
      // Retroceder al paso anterior (que quedará sin confirmar)
      setCurrentHeaderFieldIndex(currentHeaderFieldIndex - 1)
      setDraftCellOrColumn(null)
    }
  }

  const handleGoBackTable = () => {
    if (currentTableFieldIndex > 0) {
      // Si estamos en índice N de tabla (N > 0), significa que hemos confirmado N columnas
      // Al retroceder, eliminamos el último mapping confirmado
      if (tableMappings.length > 0 && tableMappings.length === currentTableFieldIndex) {
        onRemoveLastTableMapping()
      }
      // Retroceder al paso anterior (que quedará sin confirmar)
      setCurrentTableFieldIndex(currentTableFieldIndex - 1)
      setDraftCellOrColumn(null)
    } else if (currentTableFieldIndex === 0 && currentHeaderFieldIndex > 0) {
      // Si estamos en el primer campo de tabla (índice 0), volver al último campo de header
      // No hay mappings de tabla que eliminar porque aún no hemos confirmado ninguno
      // Retroceder al último campo de header
      // El índice de tabla debe quedar fuera de rango para indicar que estamos en headers
      setCurrentTableFieldIndex(schemaTemplate.table.columns.length)
      // Eliminar el último mapping de header confirmado
      // currentHeaderFieldIndex debería ser igual a schemaTemplate.headerFields.length cuando estamos en tabla
      // Entonces el último mapping confirmado es el último del array
      if (headerMappings.length > 0) {
        onRemoveLastHeaderMapping()
      }
      setCurrentHeaderFieldIndex(currentHeaderFieldIndex - 1)
      setDraftCellOrColumn(null)
    }
  }

  // Calcular progreso
  const totalFields = schemaTemplate.headerFields.length + schemaTemplate.table.columns.length
  const mappedFields = headerMappings.length + tableMappings.length
  const overallProgress = totalFields > 0 ? (mappedFields / totalFields) * 100 : 0

  // Calcular progreso de la fase actual
  const getPhaseProgress = () => {
    if (mode === "mappingHeader") {
      const current = headerMappings.length
      const total = schemaTemplate.headerFields.length
      const progress = total > 0 ? (current / total) * 100 : 0
      return { current, total, progress, label: "Fase 1 — Campos del encabezado" }
    } else if (mode === "mappingTable") {
      const current = tableMappings.length
      const total = schemaTemplate.table.columns.length
      const progress = total > 0 ? (current / total) * 100 : 0
      return { current, total, progress, label: "Fase 2 — Columnas de la tabla" }
    }
    return { current: mappedFields, total: totalFields, progress: overallProgress, label: "Completado" }
  }

  const phaseProgress = getPhaseProgress()

  // Obtener el label de un campo por su role
  const getFieldLabel = (role: string): string => {
    const field = schemaTemplate.headerFields.find(f => f.role === role)
    return field?.label || role
  }

  // Preparar datos del resumen de campos mapeados
  const mappedHeaderFields = headerMappings.map(mapping => {
    const label = getFieldLabel(mapping.role)
    const cell = mapping.cellOrColumn
    const value = renderValue(getCellValue(cell))
    return { label, cell, value }
  })

  const visibleMappedFields = showAllMappedFields 
    ? mappedHeaderFields 
    : mappedHeaderFields.slice(0, 3)
  const hasMoreFields = mappedHeaderFields.length > 3

  // Verificar si todos los campos requeridos están mapeados
  const allRequiredFieldsMapped = (): boolean => {
    // Verificar headerFields requeridos
    const requiredHeaderFields = schemaTemplate.headerFields.filter(f => f.required)
    const mappedHeaderRoles = new Set(headerMappings.map(m => m.role))
    const allRequiredHeadersMapped = requiredHeaderFields.every(f => mappedHeaderRoles.has(f.role))

    // Verificar table.columns requeridos
    const requiredTableFields = schemaTemplate.table.columns.filter(f => f.required)
    const mappedTableRoles = new Set(tableMappings.map(m => m.role))
    const allRequiredTablesMapped = requiredTableFields.every(f => mappedTableRoles.has(f.role))

    return allRequiredHeadersMapped && allRequiredTablesMapped
  }

  const canSave = allRequiredFieldsMapped()

  // Abrir diálogo para guardar mapeo
  const handleSaveMappingClick = () => {
    if (!canSave) return
    setShowSaveDialog(true)
    setMappingName("")
  }

  // Guardar mapeo en Firestore
  const handleSaveMapping = async () => {
    if (!excelData || !canSave || !mappingName.trim()) return

    setIsSaving(true)
    try {
      const instance: SchemaInstance = {
        schemaId: schemaTemplate.schemaId,
        schemaVersion: schemaTemplate.version,
        fileName: excelData.fileName,
        headerMappings: [...headerMappings],
        tableMappings: [...tableMappings],
        createdAt: new Date(),
      }

      await saveMapping({
        ...instance,
        name: mappingName.trim(),
      })

      console.log("Mapeo guardado exitosamente:", mappingName.trim())
      setShowSaveDialog(false)
      setMappingName("")
      
      if (onSave) {
        onSave(instance)
      }
    } catch (error) {
      console.error("Error al guardar mapeo:", error)
      alert("Error al guardar el mapeo. Por favor, intenta nuevamente.")
    } finally {
      setIsSaving(false)
    }
  }

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
          className="cursor-move px-3 py-2.5 border-b bg-primary text-primary-foreground"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">🧩 Mapeo de campos</span>
              <span className="text-xs opacity-90">{mappedFields}/{totalFields}</span>
            </div>
            {mode === "mappingHeader" && (
              <div className="flex items-center gap-1.5">
                <Label htmlFor="fast-mode" className="text-xs cursor-pointer opacity-90">
                  Veloz
                </Label>
                <Switch
                  id="fast-mode"
                  checked={fastMode}
                  onCheckedChange={setFastMode}
                  className="scale-75"
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-3 pb-2 space-y-3">
          {/* Información de fase actual */}
          {mode !== "idle" && (
            <div className="pt-1.5 pb-1 space-y-1.5 border-b border-border/30">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{phaseProgress.label}</span>
                <span className="text-muted-foreground">{phaseProgress.current}/{phaseProgress.total}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${phaseProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Mapeo de Header Fields */}
          {mode === "mappingHeader" && currentHeaderField && (
            <>
              {/* Campo activo - elemento más visible */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {currentHeaderField.label}
                    {currentHeaderField.required && <span className="text-destructive ml-1">*</span>}
                  </h3>
                  {currentHeaderField.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{currentHeaderField.description}</p>
                  )}
                </div>

                {/* Celda seleccionada */}
                {draftCellOrColumn ? (
                  <div className="space-y-1.5 p-3 bg-muted/50 rounded-md border border-border/50">
                    <div className="font-mono text-lg font-semibold text-foreground">
                      {draftCellOrColumn}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {renderValue(getCellValue(draftCellOrColumn))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/30 rounded-md border border-dashed border-border/50">
                    <p className="text-sm italic text-muted-foreground text-center">
                      Seleccioná la celda en el Excel que contiene este dato
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 pt-1">
                {currentHeaderFieldIndex > 0 && (
                  <Button
                    variant="outline"
                    className="h-8 text-sm"
                    onClick={handleGoBackHeader}
                  >
                    Volver
                  </Button>
                )}
                {!fastMode && (
                  <Button
                    disabled={!draftCellOrColumn}
                    className="flex-1 h-8 text-sm"
                    onClick={handleConfirmHeaderMapping}
                  >
                    Confirmar
                  </Button>
                )}
                {!currentHeaderField.required && (
                  <Button 
                    variant="outline" 
                    className="h-8 text-sm" 
                    onClick={handleSkipHeaderField}
                  >
                    Omitir
                  </Button>
                )}
                {canSave && (
                  <Button
                    variant="outline"
                    className="h-8 text-sm"
                    onClick={handleSaveMappingClick}
                  >
                    Guardar
                  </Button>
                )}
              </div>

              {/* Resumen de campos mapeados */}
              {mappedHeaderFields.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Resumen de campos mapeados</p>
                  <div className="space-y-1">
                    {visibleMappedFields.map((field, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">{field.label}:</span>{" "}
                        <span className="font-mono">{field.cell}</span> → "{field.value}"
                      </p>
                    ))}
                  </div>
                  {hasMoreFields && (
                    <button
                      type="button"
                      onClick={() => setShowAllMappedFields(!showAllMappedFields)}
                      className="text-xs text-muted-foreground hover:text-foreground mt-1.5 underline"
                    >
                      {showAllMappedFields ? "Ver menos…" : "Ver más…"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Mapeo de Table Columns */}
          {mode === "mappingTable" && currentTableField && (
            <>
              {/* Campo activo - elemento más visible */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {currentTableField.label}
                    {currentTableField.required && <span className="text-destructive ml-1">*</span>}
                  </h3>
                  {currentTableField.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{currentTableField.description}</p>
                  )}
                </div>

                {/* Columna seleccionada */}
                {draftCellOrColumn ? (
                  <div className="space-y-1.5 p-3 bg-muted/50 rounded-md border border-border/50">
                    <div className="font-mono text-lg font-semibold text-foreground">
                      Columna {draftCellOrColumn}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Seleccionada
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/30 rounded-md border border-dashed border-border/50">
                    <p className="text-sm italic text-muted-foreground text-center">
                      Seleccioná cualquier celda de la columna en el Excel
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 pt-1">
                {(currentTableFieldIndex > 0 || headerMappings.length > 0) && (
                  <Button
                    variant="outline"
                    className="h-8 text-sm"
                    onClick={handleGoBackTable}
                  >
                    Volver
                  </Button>
                )}
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
                {canSave && (
                  <Button
                    variant="outline"
                    className="h-8 text-sm"
                    onClick={handleSaveMappingClick}
                  >
                    Guardar
                  </Button>
                )}
              </div>

              {/* Resumen de campos mapeados */}
              {mappedHeaderFields.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Resumen de campos mapeados</p>
                  <div className="space-y-1">
                    {visibleMappedFields.map((field, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">{field.label}:</span>{" "}
                        <span className="font-mono">{field.cell}</span> → "{field.value}"
                      </p>
                    ))}
                  </div>
                  {hasMoreFields && (
                    <button
                      type="button"
                      onClick={() => setShowAllMappedFields(!showAllMappedFields)}
                      className="text-xs text-muted-foreground hover:text-foreground mt-1.5 underline"
                    >
                      {showAllMappedFields ? "Ver menos…" : "Ver más…"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Completado */}
          {mode === "idle" && (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
                <p className="text-sm font-medium text-foreground">
                  ✅ Mapeo completado
                </p>
              </div>

              {/* Resumen de campos mapeados */}
              {mappedHeaderFields.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Resumen de campos mapeados</p>
                  <div className="space-y-1">
                    {visibleMappedFields.map((field, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">{field.label}:</span>{" "}
                        <span className="font-mono">{field.cell}</span> → "{field.value}"
                      </p>
                    ))}
                  </div>
                  {hasMoreFields && (
                    <button
                      type="button"
                      onClick={() => setShowAllMappedFields(!showAllMappedFields)}
                      className="text-xs text-muted-foreground hover:text-foreground mt-1.5 underline"
                    >
                      {showAllMappedFields ? "Ver menos…" : "Ver más…"}
                    </button>
                  )}
                </div>
              )}

              {/* Botón Guardar cuando está completado */}
              {canSave ? (
                <div className="pt-2 border-t border-border/50">
                  <Button
                    className="w-full h-8 text-sm"
                    onClick={handleSaveMappingClick}
                  >
                    Guardar mapeo
                  </Button>
                </div>
              ) : (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Completa todos los campos requeridos para guardar
                  </p>
                </div>
              )}
            </>
          )}

          {/* Diálogo para ingresar nombre del mapeo */}
          {showSaveDialog && (
            <div className="pt-2 border-t border-border/50">
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Nombre del mapeo</p>
                <Input
                  type="text"
                  placeholder="Ej: Auditoría Casa Blanca - Enero 2024"
                  value={mappingName}
                  onChange={(e) => setMappingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && mappingName.trim() && !isSaving) {
                      handleSaveMapping()
                    }
                    if (e.key === "Escape") {
                      setShowSaveDialog(false)
                      setMappingName("")
                    }
                  }}
                  className="h-8 text-xs"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <Button
                    disabled={!mappingName.trim() || isSaving}
                    className="flex-1 h-8 text-sm"
                    onClick={handleSaveMapping}
                  >
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-sm"
                    onClick={() => {
                      setShowSaveDialog(false)
                      setMappingName("")
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
