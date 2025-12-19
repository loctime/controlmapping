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
      className="select-none"
    >
      <Card className="w-[320px] shadow-xl border bg-background">
        {/* HEADER DRAG */}
        <div
          onMouseDown={onMouseDown}
          className="cursor-move px-4 py-2 border-b bg-muted font-medium text-sm"
        >
          🧩 Mapeo de campos
        </div>

        <div className="p-4 space-y-3">
          {mode === "idle" && (
            <Button className="w-full" onClick={() => setMode("selectLabel")}>
              ➕ Nuevo campo
            </Button>
          )}

          {mode === "selectLabel" && (
            <p className="text-sm text-muted-foreground">
              Paso 1: seleccioná en el Excel el <b>nombre</b>
            </p>
          )}

          {mode === "selectValue" && (
            <p className="text-sm text-muted-foreground">
              Paso 2: seleccioná en el Excel el <b>valor</b>
            </p>
          )}

          {(draftLabelCell || draftValueCell) && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nombre</p>
                {draftLabelCell ? (
                  <Badge variant="outline">
                    {draftLabelCell} → {String(getCellValue(draftLabelCell))}
                  </Badge>
                ) : (
                  <span className="text-xs italic">no seleccionado</span>
                )}
              </div>

              <div>
                <Label htmlFor="manual-label" className="text-xs text-muted-foreground mb-1 block">
                  Nombre manual (opcional)
                </Label>
                <Input
                  id="manual-label"
                  type="text"
                  placeholder="Escribir nombre personalizado..."
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Valor</p>
                {draftValueCell ? (
                  <Badge variant="outline">
                    {draftValueCell} → {String(getCellValue(draftValueCell))}
                  </Badge>
                ) : (
                  <span className="text-xs italic">no seleccionado</span>
                )}
              </div>
            </div>
          )}

          {mode !== "idle" && (
            <div className="flex gap-2 pt-2">
              <Button
                disabled={!canCreate}
                className="flex-1"
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

              <Button variant="outline" onClick={resetDraft}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
