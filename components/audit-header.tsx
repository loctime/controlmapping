"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getMappings } from "@/lib/firebase"
import type { SchemaInstance } from "@/types/excel"

interface AuditHeaderProps {
  selectedMappingId: string | null
  onMappingSelect: (mapping: (SchemaInstance & { id: string; name: string }) | null) => void
  title?: string
}

export function AuditHeader({ selectedMappingId, onMappingSelect, title = "Dashboard de Auditorías" }: AuditHeaderProps) {
  const [mappings, setMappings] = useState<(SchemaInstance & { id: string; name: string })[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMappings = async () => {
      setIsLoading(true)
      try {
        const loadedMappings = await getMappings()
        setMappings(loadedMappings)
      } catch (error) {
        console.error("Error al cargar mappings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMappings()
  }, [])

  const selectedMapping = mappings.find((m) => m.id === selectedMappingId) || null

  return (
    <header className="border-b border-border bg-card shrink-0">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-foreground shrink-0">{title}</h1>
            <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 max-w-md">
              <label htmlFor="mapping-select" className="text-sm text-muted-foreground shrink-0 whitespace-nowrap">
                Mapeo:
              </label>
              <Select
                value={selectedMappingId || ""}
                onValueChange={(value) => {
                  const mapping = mappings.find((m) => m.id === value) || null
                  onMappingSelect(mapping)
                }}
              >
                <SelectTrigger id="mapping-select" disabled={isLoading} className="w-full">
                  <SelectValue placeholder={isLoading ? "Cargando..." : "Seleccionar un mapeo"} />
                </SelectTrigger>
                <SelectContent>
                  {mappings.length === 0 && !isLoading && (
                    <SelectItem value="no-mappings" disabled>
                      No hay mapeos guardados
                    </SelectItem>
                  )}
                  {mappings.map((mapping) => (
                    <SelectItem key={mapping.id} value={mapping.id}>
                      {mapping.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedMapping && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span>{selectedMapping.schemaId}</span>
              <span>•</span>
              <span>{selectedMapping.headerMappings.length} headers</span>
              <span>•</span>
              <span>{selectedMapping.tableMappings.length} columnas</span>
            </div>
          )}
        </div>
        {/* Selector móvil */}
        <div className="md:hidden mt-3">
          <Select
            value={selectedMappingId || ""}
            onValueChange={(value) => {
              const mapping = mappings.find((m) => m.id === value) || null
              onMappingSelect(mapping)
            }}
          >
            <SelectTrigger id="mapping-select-mobile" disabled={isLoading} className="w-full">
              <SelectValue placeholder={isLoading ? "Cargando..." : "Seleccionar un mapeo"} />
            </SelectTrigger>
            <SelectContent>
              {mappings.length === 0 && !isLoading && (
                <SelectItem value="no-mappings" disabled>
                  No hay mapeos guardados
                </SelectItem>
              )}
              {mappings.map((mapping) => (
                <SelectItem key={mapping.id} value={mapping.id}>
                  {mapping.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  )
}

