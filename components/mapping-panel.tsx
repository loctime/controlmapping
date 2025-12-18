"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Tag, CheckCircle2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import type { CellMapping, ExcelData } from "@/types/excel"

interface MappingPanelProps {
  selectedCell: string | null
  mappings: CellMapping[]
  onAddMapping: (label: string) => void
  onRemoveMapping: (id: string) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  excelData?: ExcelData | null
}

const COMMON_LABELS = [
  "Razón social",
  "Fecha de factura",
  "Número de factura",
  "Monto total",
  "IVA",
  "Subtotal",
  "Cliente",
  "Email",
  "Teléfono",
  "Dirección",
  "Ciudad",
  "Código postal",
  "País",
  "Producto",
  "Cantidad",
  "Precio unitario",
]

export function MappingPanel({ 
  selectedCell, 
  mappings, 
  onAddMapping, 
  onRemoveMapping,
  isOpen,
  onOpenChange,
  excelData
}: MappingPanelProps) {
  const [customLabel, setCustomLabel] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleAddLabel = (label: string) => {
    if (label.trim()) {
      onAddMapping(label.trim())
      setCustomLabel("")
      setShowCustomInput(false)
    }
  }

  const isCellMapped = (cellId: string) => {
    return mappings.some((m) => m.cellId === cellId)
  }

  // Obtener el valor de la celda seleccionada
  const getCellValue = (cellId: string | null): string => {
    if (!cellId || !excelData || !excelData.sheets[0]) return ""
    const cell = excelData.sheets[0].cells[cellId]
    if (!cell) return ""
    const value = cell.value
    if (value === null || value === undefined) return ""
    return String(value).trim()
  }

  const cellValue = getCellValue(selectedCell)

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Mapeo de campos
              </SheetTitle>
              <SheetDescription className="mt-1">
                Selecciona celdas y asigna etiquetas
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
          {/* Selected Cell Section */}
          {selectedCell ? (
            <Card className="p-4 bg-accent/50 border-primary/20">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium text-foreground">Celda seleccionada</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedCell}
                    </Badge>
                    {cellValue && (
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={cellValue}>
                        {cellValue}
                      </span>
                    )}
                  </div>
                </div>

                {isCellMapped(selectedCell) ? (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Esta celda ya está mapeada</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground">Etiquetas comunes</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_LABELS.slice(0, 6).map((label) => (
                        <Button
                          key={label}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddLabel(label)}
                          className="text-xs"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>

                    {!showCustomInput ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomInput(true)}
                        className="w-full gap-2 h-8"
                      >
                        <Plus className="h-3 w-3" />
                        Etiqueta personalizada
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          placeholder="Nombre del campo..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleAddLabel(customLabel)
                            } else if (e.key === "Escape") {
                              setShowCustomInput(false)
                              setCustomLabel("")
                            }
                          }}
                          autoFocus
                          className="flex-1 h-8"
                        />
                        <Button onClick={() => handleAddLabel(customLabel)} disabled={!customLabel.trim()} size="sm" className="h-8 px-3">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                Haz clic en una celda del Excel para comenzar el mapeo
              </p>
            </Card>
          )}

          {/* Mappings List */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Campos mapeados ({mappings.length})</Label>

            {mappings.length === 0 ? (
              <Card className="p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">No hay campos mapeados todavía</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {mappings.map((mapping) => (
                  <Card key={mapping.id} className="p-3 flex items-center justify-between gap-2 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">
                        {mapping.cellId}
                      </Badge>
                      <span className="text-sm font-medium text-foreground truncate">{mapping.label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMapping(mapping.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {mappings.length > 0 && (
            <Card className="p-4 bg-muted/50">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Acciones rápidas</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 bg-transparent h-8"
                  onClick={() => {
                    const schema = mappings.map((m) => `${m.cellId}: ${m.label}`).join("\n")
                    navigator.clipboard.writeText(schema)
                  }}
                >
                  Copiar esquema
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 bg-transparent h-8"
                  onClick={() => {
                    const name = window.prompt('Nombre de la plantilla:')
                    if (!name) return
                    try {
                      const key = 'excelTemplates'
                      const raw = localStorage.getItem(key)
                      const arr = raw ? JSON.parse(raw) : []
                      const tpl = { name: name.trim(), mappings }
                      const idx = arr.findIndex((t: any) => t.name === tpl.name)
                      if (idx >= 0) arr[idx] = tpl
                      else arr.push(tpl)
                      localStorage.setItem(key, JSON.stringify(arr))
                      alert('Plantilla guardada')
                    } catch (err) {
                      // eslint-disable-next-line no-console
                      console.error(err)
                      alert('Error guardando la plantilla')
                    }
                  }}
                >
                  Guardar plantilla
                </Button>
              </div>
            </Card>
          )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
