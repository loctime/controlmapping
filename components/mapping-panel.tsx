"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Tag, CheckCircle2 } from "lucide-react"
import { saveTemplate } from "@/lib/firebase"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import type { CellMapping, ExcelData } from "@/types/excel"

interface MappingPanelProps {
  selectedCell: string | null
  mappings: CellMapping[]
  onAddMapping: (mapping: Omit<CellMapping, 'id' | 'createdAt'>) => void
  onRemoveMapping: (id: string) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  excelData?: ExcelData | null
}

// NOTE: The mapping model is intentionally simple: each mapping stores two
// cell refs: `labelCell` and `valueCell`. No automatic inference is performed.

export function MappingPanel({ 
  selectedCell, 
  mappings, 
  onAddMapping, 
  onRemoveMapping,
  isOpen,
  onOpenChange,
  excelData
}: MappingPanelProps) {
  const [draftLabelCell, setDraftLabelCell] = useState<string | null>(null)
  const [draftValueCell, setDraftValueCell] = useState<string | null>(null)
  const [pendingSelectFor, setPendingSelectFor] = useState<null | 'label' | 'value'>(null)
  const [selectedRole, setSelectedRole] = useState<'label' | 'value'>('label')

  const isCellMapped = (cellId: string) => {
    return mappings.some((m) => m.labelCell === cellId || m.valueCell === cellId)
  }

  // Obtener el valor de la celda seleccionada
  const getCellValue = (cellId: string | null): string => {
    if (!cellId || !excelData || !excelData.sheets[0]) return ""
    const cell = excelData.sheets[0].cells[cellId]
    if (!cell) return ""
    const value = cell.value
    if (value === null || value === undefined) return ""

    const formatPercent = (num: number) => {
      const pct = num * 100
      // keep up to 2 decimals, but trim trailing zeros
      const txt = pct.toFixed(2).replace(/\.?0+$/, '')
      return `${txt}%`
    }

    // If it's already a number, check if looks like a fraction (0 < |x| < 1)
    if (typeof value === 'number') {
      if (Math.abs(value) > 0 && Math.abs(value) < 1) return formatPercent(value)
      return String(value).trim()
    }

    // If it's a string, try to be helpful: handle percentage strings and numeric strings
    if (typeof value === 'string') {
      const s = value.trim()
      if (s === '') return ''
      // already a percent string
      if (s.endsWith('%')) return s
      // try parse number (allow commas as thousand separators)
      const n = Number(s.replace(/,/g, ''))
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        if (Math.abs(n) > 0 && Math.abs(n) < 1) return formatPercent(n)
        return String(n).trim()
      }
      return s
    }

    return String(value).trim()
  }

  const cellValue = getCellValue(selectedCell)

  useEffect(() => {
    // If we're waiting for the missing cell and the user selected a cell,
    // behave differently depending on whether the panel is open:
    // - If the panel is open: finalize the mapping immediately (existing behavior).
    // - If the panel is closed: set the missing draft cell so when the user
    //   re-opens the panel the second card shows the selection (do NOT finalize).
    if (!selectedCell || !pendingSelectFor) return

    // Panel closed: set the draft cell and keep things pending cleared.
    if (!isOpen) {
      if (pendingSelectFor === 'value' && draftLabelCell) {
        if (selectedCell === draftLabelCell) return
        setDraftValueCell(selectedCell)
        setPendingSelectFor(null)
        return
      }
      if (pendingSelectFor === 'label' && draftValueCell) {
        if (selectedCell === draftValueCell) return
        setDraftLabelCell(selectedCell)
        setPendingSelectFor(null)
        return
      }
      return
    }

    // Panel open: finalize mapping immediately (original behavior).
    if (pendingSelectFor === 'value' && draftLabelCell) {
      if (selectedCell === draftLabelCell) return
      onAddMapping({ labelCell: draftLabelCell, valueCell: selectedCell })
      setDraftLabelCell(null)
      setPendingSelectFor(null)
    }

    if (pendingSelectFor === 'label' && draftValueCell) {
      if (selectedCell === draftValueCell) return
      onAddMapping({ labelCell: selectedCell, valueCell: draftValueCell })
      setDraftValueCell(null)
      setPendingSelectFor(null)
    }
  }, [selectedCell, pendingSelectFor, draftLabelCell, draftValueCell, onAddMapping, isOpen])

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col overflow-hidden">
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

        <ScrollArea className="flex-1 overflow-auto px-6 py-4 pb-6">
          <div className="space-y-6">
          {/* Selected Cell Section */}
          {selectedCell ? (
            <>
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
                    <Label className="text-xs text-muted-foreground">Flujo: seleccione la celda que contiene el nombre (label) y luego la celda que contiene el valor</Label>

                    {!draftLabelCell && !draftValueCell ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value as 'label' | 'value')}
                          className="text-sm h-8 px-2 rounded border border-border bg-card"
                        >
                          <option value="label">Nombre (label)</option>
                          <option value="value">Dato (value)</option>
                        </select>
                        <Button size="sm" variant="secondary" className="h-8" onClick={() => {
                          if (!selectedCell) return
                          if (selectedRole === 'label') {
                            setDraftLabelCell(selectedCell)
                            setPendingSelectFor('value')
                          } else {
                            setDraftValueCell(selectedCell)
                            setPendingSelectFor('label')
                          }
                        }}>
                          Marcar como
                        </Button>
                      </div>
                    ) : draftLabelCell ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">{draftLabelCell}</Badge>
                          <div className="text-sm truncate">Label seleccionado</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setDraftLabelCell(null)}>Cancelar</Button>
                          <Button size="sm" variant="primary" disabled={selectedCell === draftLabelCell} onClick={() => {
                            if (!draftLabelCell || !selectedCell) return
                            onAddMapping({ labelCell: draftLabelCell, valueCell: selectedCell })
                            setDraftLabelCell(null)
                          }}>
                            Crear mapeo: {draftLabelCell} → {selectedCell}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // draftValueCell is set
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">{draftValueCell}</Badge>
                          <div className="text-sm truncate">Dato seleccionado</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setDraftValueCell(null)}>Cancelar</Button>
                          <Button size="sm" variant="primary" disabled={selectedCell === draftValueCell} onClick={() => {
                            if (!draftValueCell || !selectedCell) return
                            // inverse: selectedCell will be label, draftValueCell is value
                            onAddMapping({ labelCell: selectedCell, valueCell: draftValueCell })
                            setDraftValueCell(null)
                          }}>
                            Crear mapeo: {selectedCell} → {draftValueCell}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Second cell card: shows the counterpart cell (or placeholder) and a button to close the panel */}
            <Card className="p-4 bg-muted/50 mt-3">
              <Label className="text-sm font-medium text-foreground">Segunda celda</Label>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {(draftLabelCell ? (draftValueCell || 'No seleccionada') : (draftValueCell ? (draftLabelCell || 'No seleccionada') : 'No seleccionada'))}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {draftLabelCell || draftValueCell ? (draftLabelCell ? 'Falta seleccionar dato (value)' : 'Falta seleccionar nombre (label)') : 'No hay segunda celda seleccionada'}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => {
                  // Ensure pendingSelectFor is set to the missing role so the next
                  // cell selection (while the panel is closed) will populate the second card.
                  if (!pendingSelectFor) {
                    if (draftLabelCell) setPendingSelectFor('value')
                    else if (draftValueCell) setPendingSelectFor('label')
                  }
                  onOpenChange(false)
                }}>Seleccionar</Button>
              </div>
            </Card>
            </>
          ) : (
            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                Haz clic en una celda del Excel para comenzar el mapeo
              </p>
                          <Button size="sm" variant="outline" onClick={() => setPendingSelectFor('label')}>Mappear la celda que falta</Button>
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
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">{mapping.valueCell}</Badge>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{mapping.labelCell}</span>
                        <span className="text-xs text-muted-foreground truncate">valor: {mapping.valueCell}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onRemoveMapping(mapping.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
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
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 bg-transparent h-8" onClick={() => {
                    const schema = mappings.map((m) => `${m.labelCell}: ${m.valueCell}`).join("\n")
                    navigator.clipboard.writeText(schema)
                  }}>
                  Copiar esquema
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 bg-transparent h-8"
                  onClick={async () => {
                    const name = window.prompt('Nombre de la plantilla:')
                    if (!name) return
                    try {
                      await saveTemplate(name.trim(), mappings)
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
