"use client"

import { use, useEffect, useState } from "react"
import { OperatorDashboard } from "@/components/OperatorDashboard"
import { Card } from "@/components/ui/card"
import type { AuditFile } from "@/parsers/auditParser"

/**
 * Página de dashboard por operario
 * 
 * Los datos de auditorías se obtienen desde localStorage (guardados por AuditDashboard)
 */
export default function OperatorDashboardPage({
  params,
}: {
  params: Promise<{ operatorId: string }>
}) {
  const resolvedParams = use(params)
  const [auditFiles, setAuditFiles] = useState<AuditFile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Obtener datos desde localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("auditFiles")
        if (stored) {
          const parsed = JSON.parse(stored)
          // Convertir fechas de string a Date
          const restored = parsed.map((audit: any) => ({
            ...audit,
            headers: {
              ...audit.headers,
              fecha: audit.headers.fecha ? new Date(audit.headers.fecha) : null,
            },
          }))
          setAuditFiles(restored)
        }
      } catch (err) {
        console.error("Error al leer auditFiles desde localStorage:", err)
      } finally {
        setIsLoading(false)
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </Card>
      </div>
    )
  }

  // Si no hay datos, mostrar mensaje
  if (auditFiles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 max-w-md">
          <div className="space-y-4">
            <h1 className="text-xl font-semibold">Dashboard de Operario</h1>
            <p className="text-sm text-muted-foreground">
              No se encontraron datos de auditorías. Por favor, navegá desde el dashboard general
              haciendo click en un operario.
            </p>
            <p className="text-xs text-muted-foreground">
              Operario ID: {decodeURIComponent(resolvedParams.operatorId)}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <OperatorDashboard
        auditFiles={auditFiles}
        operatorId={decodeURIComponent(resolvedParams.operatorId)}
      />
    </div>
  )
}
