"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getMappings } from "@/lib/firebase"
import type { SchemaInstance } from "@/types/excel"

interface MappingSelectorProps {
  selectedMappingId: string | null
  onMappingSelect: (mapping: (SchemaInstance & { id: string; name: string }) | null) => void
}

export function MappingSelector({ selectedMappingId, onMappingSelect }: MappingSelectorProps) {
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
    <Card className="p-4">
      <div className="space-y-2">
        <Label htmlFor="mapping-select">Mapeo guardado</Label>
        <Select
          value={selectedMappingId || ""}
          onValueChange={(value) => {
            const mapping = mappings.find((m) => m.id === value) || null
            onMappingSelect(mapping)
          }}
        >
          <SelectTrigger id="mapping-select" disabled={isLoading}>
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
        {selectedMapping && (
          <div className="text-sm text-muted-foreground mt-2 space-y-1">
            <p>
              <span className="font-medium">Schema:</span> {selectedMapping.schemaId} (v{selectedMapping.schemaVersion})
            </p>
            <p>
              <span className="font-medium">Campos de encabezado:</span> {selectedMapping.headerMappings.length}
            </p>
            <p>
              <span className="font-medium">Columnas de tabla:</span> {selectedMapping.tableMappings.length}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

