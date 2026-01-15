"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"
import type { AuditItem } from "@/domains/audit/types"

interface NonComplianceListProps {
  items: AuditItem[]
}

export function NonComplianceList({ items }: NonComplianceListProps) {
  // Filtrar ítems con estado "no_cumple" o "cumple_parcial"
  const nonComplianceItems = useMemo(() => {
    return items.filter(
      (item) => item.estado === "no_cumple" || item.estado === "cumple_parcial"
    )
  }, [items])

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

  // Separar por estado para mostrar primero los más críticos
  const noCumpleItems = nonComplianceItems.filter((item) => item.estado === "no_cumple")
  const cumpleParcialItems = nonComplianceItems.filter((item) => item.estado === "cumple_parcial")

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">Incumplimientos detectados</Label>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">
          {nonComplianceItems.length} ítem{nonComplianceItems.length !== 1 ? "s" : ""} que requiere{nonComplianceItems.length === 1 ? "" : "n"} atención
        </p>

        <div className="space-y-2">
          {/* Ítems con estado "no_cumple" */}
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
                  {item.observaciones && (
                    <p className="text-xs text-muted-foreground mt-1">{item.observaciones}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Ítems con estado "cumple_parcial" */}
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
                  {item.observaciones && (
                    <p className="text-xs text-muted-foreground mt-1">{item.observaciones}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
