"use client"

import { useRef, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ExcelData, CellMapping } from "@/types/excel"

type MappingMode = "idle" | "selectLabel" | "selectValue"

interface FloatingMappingPanelProps {
  excelData?: ExcelData | null
  selectedCell: string | null

  mode: MappingMode
  setMode: (mode: MappingMode) => void

  draftLabelCell: string | null
  setDraftLabelCell: (cell: string | null) => void

  draftValueCell: string | null
  setDraftValueCell: (cell: string | null) => void

  onCreateMapping: (mapping: Omit<CellMapping, "id" | "createdAt">) => void
}

export function FloatingMappingPanel({
  excelData,
  selectedCell,
  mode,
  setMode,
  draftLabelCell,
  setDraftLabelCell,
  draftValueCell,
  setDraftValueCell,
  onCreateMapping,
}: FloatingMappingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState({ x: 24, y: 96 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const draggingRef = useRef(false)
  const posRef = useRef({ x: 24, y: 96 })
  const [manualLabel, setManualLabel] = useState<string>("")

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

  // reaccionar al click en el Excel según el paso
  useEffect(() => {
    if (!selectedCell) return

    if (mode === "selectLabel") {
      setDraftLabelCell(selectedCell)
      setMode("selectValue")
    }

    if (mode === "selectValue") {
      setDraftValueCell(selectedCell)
    }
  }, [selectedCell, mode, setDraftLabelCell, setDraftValueCell, setMode])

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

  const resetDraft = () => {
    setDraftLabelCell(null)
    setDraftValueCell(null)
    setManualLabel("")
    setMode("idle")
  }

  const canCreate = Boolean(draftLabelCell && draftValueCell)

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

        <div className="px-3 py-1 space-y-1.5">
          {mode === "idle" && (
            <Button className="w-full h-8 text-sm" onClick={() => setMode("selectLabel")}>
              ➕ Nuevo campo
            </Button>
          )}

          {mode === "selectLabel" && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
              <p className="text-xs text-foreground">
                Paso 1: seleccioná en el Excel el <b>nombre</b>
              </p>
            </div>
          )}

          {mode === "selectValue" && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
              <p className="text-xs text-foreground">
                Paso 2: seleccioná en el Excel el <b>valor</b>
              </p>
            </div>
          )}

          {(draftLabelCell || draftValueCell) && (
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5 w-full">
  <span className="flex items-center gap-1">
    <p className="text-xs text-muted-foreground font-medium">Nombre</p>
    {draftLabelCell && (
      <button
        type="button"
        onClick={() => {
          setDraftLabelCell(null);
          setMode("selectLabel");
        }}
        className="px-1 py-0.5 text-xs border border-primary rounded bg-primary/10 text-primary hover:bg-primary/20 transition-shadow"
        tabIndex={0}
        title="Editar celda de nombre"
      >
        Editar
      </button>
    )}
  </span>
  <Label htmlFor="manual-label" className="text-xs text-muted-foreground font-normal ml-auto">
    Nombre manual (opcional)
  </Label>
</div>
                <div className="flex gap-1">
                  {draftLabelCell ? (
                    <Badge variant="outline" className="bg-white shadow-sm border-border/50 font-mono text-xs whitespace-normal break-words max-w-[140px]">
                      {draftLabelCell} → {renderValue(getCellValue(draftLabelCell))}
                    </Badge>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">no seleccionado</span>
                  )}
                  <Input
                    id="manual-label"
                    type="text"
                    placeholder="Personalizado..."
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    className="h-7 text-xs max-w-[120px] ml-auto"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Valor</p>
                {draftValueCell ? (
                  <Badge variant="outline" className="bg-white shadow-sm border-border/50 font-mono text-xs whitespace-normal break-words max-w-[140px]">
                    {draftValueCell} → {String(getCellValue(draftValueCell))}
                  </Badge>
                ) : (
                  <span className="text-xs italic text-muted-foreground">no seleccionado</span>
                )}
              </div>
            </div>
          )}

          {mode !== "idle" && (
            <div className="flex gap-1.5 pt-1">
              <Button
                disabled={!canCreate}
                className="flex-1 h-8 text-sm"
                onClick={() => {
                  if (!draftLabelCell || !draftValueCell) return
                  onCreateMapping({
                    labelCell: draftLabelCell,
                    valueCell: draftValueCell,
                    ...(manualLabel.trim() && { labelOverride: manualLabel.trim() }),
                  })
                  resetDraft()
                }}
              >
                Crear
              </Button>

              <Button variant="outline" className="h-8 text-sm" onClick={resetDraft}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
