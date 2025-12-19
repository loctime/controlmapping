"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import type { ExcelData, CellMapping } from "@/types/excel"

type MappingMode = "idle" | "selectLabel" | "selectValue"

interface MappingPanelProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void

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

export function MappingPanel({
  isOpen,
  onOpenChange,
  excelData,
  selectedCell,
  mode,
  setMode,
  draftLabelCell,
  setDraftLabelCell,
  draftValueCell,
  setDraftValueCell,
  onCreateMapping,
}: MappingPanelProps) {
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

  const resetDraft = () => {
    setDraftLabelCell(null)
    setDraftValueCell(null)
    setMode("idle")
  }

  const canCreate = Boolean(draftLabelCell && draftValueCell)

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[380px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Mapeo de campos</SheetTitle>
          <SheetDescription>
            Seleccioná celdas del Excel para armar pares nombre / valor
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {/* ESTADO IDLE */}
          {mode === "idle" && (
            <Card className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Empezá un nuevo campo mapeando primero el nombre y luego su valor.
              </p>
              <Button onClick={() => setMode("selectLabel")} className="w-full">
                ➕ Nuevo campo
              </Button>
            </Card>
          )}

          {/* PASO 1 */}
          {mode === "selectLabel" && (
            <Card className="p-4 space-y-2 border-primary/40">
              <p className="font-medium">Paso 1</p>
              <p className="text-sm text-muted-foreground">
                Seleccioná en el Excel la celda que contiene el <b>nombre del dato</b>
              </p>
            </Card>
          )}

          {/* PASO 2 */}
          {mode === "selectValue" && (
            <Card className="p-4 space-y-2 border-primary/40">
              <p className="font-medium">Paso 2</p>
              <p className="text-sm text-muted-foreground">
                Seleccioná en el Excel la celda que contiene el <b>valor</b>
              </p>
            </Card>
          )}

          {/* PREVIEW */}
          {(draftLabelCell || draftValueCell) && (
            <Card className="p-4 space-y-3 bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                {draftLabelCell ? (
                  <Badge variant="outline">
                    {draftLabelCell} → {String(getCellValue(draftLabelCell))}
                  </Badge>
                ) : (
                  <span className="text-xs italic text-muted-foreground">no seleccionado</span>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                {draftValueCell ? (
                  <Badge variant="outline">
                    {draftValueCell} → {String(getCellValue(draftValueCell))}
                  </Badge>
                ) : (
                  <span className="text-xs italic text-muted-foreground">no seleccionado</span>
                )}
              </div>
            </Card>
          )}

          {/* ACCIONES */}
          {(mode !== "idle") && (
            <div className="flex gap-2 pt-2">
              <Button
                disabled={!canCreate}
                className="flex-1"
                onClick={() => {
                  if (!draftLabelCell || !draftValueCell) return
                  onCreateMapping({
                    labelCell: draftLabelCell,
                    valueCell: draftValueCell,
                  })
                  resetDraft()
                }}
              >
                Crear mapeo
              </Button>

              <Button variant="outline" onClick={resetDraft}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
