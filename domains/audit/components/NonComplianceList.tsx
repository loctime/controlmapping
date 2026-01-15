"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import type { AuditItem, AuditFile } from "@/domains/audit/types"

interface NonComplianceListProps {
  items: AuditItem[]
  auditFiles: AuditFile[]
}

interface ItemWithContext extends AuditItem {
  operacion?: string
  operario?: string
  responsable?: string
}

export function NonComplianceList({ items, auditFiles }: NonComplianceListProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Filtros
  const [filters, setFilters] = useState({
    estados: {
      no_cumple: true,
      cumple_parcial: true,
    },
    operacion: "all" as string,
    operario: "all" as string,
  })

  // Crear mapa de items con contexto (operación, operario)
  const itemsWithContext = useMemo((): ItemWithContext[] => {
    const result: ItemWithContext[] = []
    
    auditFiles.forEach((file) => {
      const operacion = file.headers.operacion 
        ? String(file.headers.operacion).trim() 
        : undefined
      const operario = file.headers.operario 
        ? String(file.headers.operario).trim()
        : file.headers.auditor
          ? String(file.headers.auditor).trim()
          : file.headers.responsable
            ? String(file.headers.responsable).trim()
            : undefined
      
      file.items.forEach((item) => {
        result.push({
          ...item,
          operacion,
          operario,
        })
      })
    })
    
    return result
  }, [auditFiles])

  // Filtrar ítems con estado "no_cumple" o "cumple_parcial" inicialmente
  const nonComplianceItems = useMemo(() => {
    return itemsWithContext.filter(
      (item) => item.estado === "no_cumple" || item.estado === "cumple_parcial"
    )
  }, [itemsWithContext])

  // Lista de operaciones únicas
  const operaciones = useMemo(() => {
    const set = new Set<string>()
    nonComplianceItems.forEach((item) => {
      if (item.operacion) {
        set.add(item.operacion)
      }
    })
    return Array.from(set).sort()
  }, [nonComplianceItems])

  // Lista de operarios únicos
  const operarios = useMemo(() => {
    const set = new Set<string>()
    nonComplianceItems.forEach((item) => {
      if (item.operario) {
        set.add(item.operario)
      }
    })
    return Array.from(set).sort()
  }, [nonComplianceItems])

  // Aplicar filtros
  const filteredItems = useMemo(() => {
    return nonComplianceItems.filter((item) => {
      // Filtro por estado
      if (item.estado === "no_cumple" && !filters.estados.no_cumple) {
        return false
      }
      if (item.estado === "cumple_parcial" && !filters.estados.cumple_parcial) {
        return false
      }
      
      // Filtro por operación
      if (filters.operacion !== "all" && item.operacion !== filters.operacion) {
        return false
      }
      
      // Filtro por operario
      if (filters.operario !== "all" && item.operario !== filters.operario) {
        return false
      }
      
      return true
    })
  }, [nonComplianceItems, filters])

  // Separar por estado para mostrar primero los más críticos
  const noCumpleItems = useMemo(() => {
    return filteredItems.filter((item) => item.estado === "no_cumple")
  }, [filteredItems])

  const cumpleParcialItems = useMemo(() => {
    return filteredItems.filter((item) => item.estado === "cumple_parcial")
  }, [filteredItems])

  // Contadores por estado (usando lista filtrada)
  const contadores = useMemo(() => {
    return {
      noCumple: noCumpleItems.length,
      cumpleParcial: cumpleParcialItems.length,
      total: filteredItems.length,
    }
  }, [noCumpleItems.length, cumpleParcialItems.length, filteredItems.length])

  if (nonComplianceItems.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Incumplimientos detectados</Label>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          No se detectaron incumplimientos o cumplimientos parciales
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header siempre visible con filtros */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Izquierda: Título + Contador */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Label className="text-base font-semibold">Incumplimientos detectados</Label>
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              ({contadores.total} ítem{contadores.total !== 1 ? "s" : ""})
            </span>
          </div>

          {/* Centro: Filtros de estado + Operación */}
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
            {/* Filtros por estado */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="filter-no-cumple"
                  checked={filters.estados.no_cumple}
                  onCheckedChange={(checked) => {
                    setFilters((prev) => ({
                      ...prev,
                      estados: {
                        ...prev.estados,
                        no_cumple: checked === true,
                      },
                    }))
                  }}
                />
                <label
                  htmlFor="filter-no-cumple"
                  className="text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  No Cumple
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="filter-cumple-parcial"
                  checked={filters.estados.cumple_parcial}
                  onCheckedChange={(checked) => {
                    setFilters((prev) => ({
                      ...prev,
                      estados: {
                        ...prev.estados,
                        cumple_parcial: checked === true,
                      },
                    }))
                  }}
                />
                <label
                  htmlFor="filter-cumple-parcial"
                  className="text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  Cumple Parcial
                </label>
              </div>
            </div>

            {/* Filtro por operación */}
            {operaciones.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Label htmlFor="filter-operacion" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Operación:
                </Label>
                <Select
                  value={filters.operacion}
                  onValueChange={(value) => {
                    setFilters((prev) => ({ ...prev, operacion: value }))
                  }}
                >
                  <SelectTrigger id="filter-operacion" className="h-8 text-xs w-[140px]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {operaciones.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Derecha: Filtro de operario */}
          {operarios.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Label htmlFor="filter-operario" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Operario:
              </Label>
              <Select
                value={filters.operario}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, operario: value }))
                }}
              >
                <SelectTrigger id="filter-operario" className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {operarios.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Botón de colapsar */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-muted/50 rounded transition-colors flex-shrink-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        {/* Contador siempre visible */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {contadores.noCumple > 0 && (
            <span>
              <span className="font-medium text-red-600 dark:text-red-400">{contadores.noCumple}</span> no cumple
            </span>
          )}
          {contadores.cumpleParcial > 0 && (
            <span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">{contadores.cumpleParcial}</span> cumple parcial
            </span>
          )}
        </div>

        {/* Contenido colapsable - Solo la lista */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
            <div className="pt-2 max-h-[600px] overflow-y-auto">

              {/* Ítems filtrados */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No hay ítems que coincidan con los filtros seleccionados
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Ítems con estado "no_cumple" */}
                  {noCumpleItems.length > 0 && (
                    <>
                      {noCumpleItems.map((item, index) => (
                        <div
                          key={`no-cumple-${index}`}
                          className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800"
                        >
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white shrink-0">
                              NO CUMPLE
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{item.pregunta}</p>
                              {(item.operacion || item.operario) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.operacion && <span>{item.operacion}</span>}
                                  {item.operacion && item.operario && <span> • </span>}
                                  {item.operario && <span>{item.operario}</span>}
                                </p>
                              )}
                              {item.observaciones && (
                                <p className="text-xs text-muted-foreground mt-1">{item.observaciones}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Ítems con estado "cumple_parcial" */}
                  {cumpleParcialItems.length > 0 && (
                    <>
                      {cumpleParcialItems.map((item, index) => (
                        <div
                          key={`cumple-parcial-${index}`}
                          className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800"
                        >
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-600 text-white shrink-0">
                              CUMPLE PARCIAL
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{item.pregunta}</p>
                              {(item.operacion || item.operario) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.operacion && <span>{item.operacion}</span>}
                                  {item.operacion && item.operario && <span> • </span>}
                                  {item.operario && <span>{item.operario}</span>}
                                </p>
                              )}
                              {item.observaciones && (
                                <p className="text-xs text-muted-foreground mt-1">{item.observaciones}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  )
}
