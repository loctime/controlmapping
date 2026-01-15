"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AuditHeader } from "@/components/audit-header"
import { MultiFileUpload } from "@/components/multi-file-upload"
import { AuditDashboard } from "@/domains/audit/components/AuditDashboard"
import { AuditCalendar } from "@/domains/audit/components/AuditCalendar"
import { getSchemaTemplate } from "@/lib/firebase"
import { parseAudit, type AuditFile } from "@/domains/audit"
import type { SchemaInstance, SchemaTemplate, ExcelData } from "@/types/excel"
import { Loader2 } from "lucide-react"

export default function AuditPage() {
  const [selectedMapping, setSelectedMapping] = useState<(SchemaInstance & { id: string; name: string }) | null>(null)
  const [schemaTemplate, setSchemaTemplate] = useState<SchemaTemplate | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [auditResults, setAuditResults] = useState<AuditFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar schema template cuando se selecciona un mapping
  const handleMappingSelect = async (mapping: (SchemaInstance & { id: string; name: string }) | null) => {
    setSelectedMapping(mapping)
    setAuditResults([])
    setError(null)
    
    if (mapping) {
      try {
        const template = await getSchemaTemplate(mapping.schemaId)
        if (!template) {
          setError(`No se encontró el schema template para ${mapping.schemaId}`)
          setSchemaTemplate(null)
        } else {
          setSchemaTemplate(template)
        }
      } catch (err) {
        console.error("Error al cargar schema template:", err)
        setError("Error al cargar el schema template")
        setSchemaTemplate(null)
      }
    } else {
      setSchemaTemplate(null)
    }
  }

  // Función para leer Excel (solo valores, sin estilos)
  const readExcelFile = async (file: File): Promise<ExcelData> => {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellStyles: false,
      cellHTML: false,
    })

    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")

    const cells: Record<string, { value: string | number }> = {}

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = worksheet[cellAddress]

        if (cell) {
          let cellValue: string | number = ""
          if (cell.v !== undefined && cell.v !== null) {
            if (cell.t === "n") {
              cellValue = cell.v as number
            } else if (cell.t === "b") {
              cellValue = cell.v ? "TRUE" : "FALSE"
            } else {
              cellValue = String(cell.v)
            }
          }

          cells[cellAddress] = {
            value: cellValue,
          }
        }
      }
    }

    return {
      fileName: file.name,
      sheets: [
        {
          name: firstSheetName,
          rows: range.e.r + 1,
          cols: range.e.c + 1,
          cells,
        },
      ],
    }
  }

  // Función principal de procesamiento
  const processFiles = async () => {
    if (!selectedMapping || !schemaTemplate || files.length === 0) {
      setError("Por favor seleccioná un mapeo y al menos un archivo Excel")
      return
    }

    setIsProcessing(true)
    setError(null)
    const results: AuditFile[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        try {
          const excelData = await readExcelFile(file)
          const auditFile = parseAudit(excelData, schemaTemplate, selectedMapping)
          results.push(auditFile)
          console.log(`Procesado: ${file.name}`)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Error desconocido"
          console.error(`Error al procesar ${file.name}:`, errorMessage)
          setError(`Error al procesar ${file.name}: ${errorMessage}`)
        }
      }

      if (results.length > 0) {
        setAuditResults(results)
      }
    } catch (err) {
      console.error("Error al procesar archivos:", err)
      setError(`Error al procesar archivos: ${err instanceof Error ? err.message : "Error desconocido"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const canProcess = selectedMapping !== null && schemaTemplate !== null && files.length > 0 && !isProcessing

  return (
    <div className="min-h-screen flex flex-col">
      <AuditHeader selectedMappingId={selectedMapping?.id || null} onMappingSelect={handleMappingSelect} />
      <div className="container mx-auto py-8 px-4 max-w-7xl flex-1">
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground">
              Procesá múltiples archivos Excel de auditorías y generá un reporte consolidado
            </p>
          </div>

          {error && (
            <Card className="p-4 border-destructive bg-destructive/10">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          <MultiFileUpload files={files} onFilesChange={setFiles} />

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Procesar archivos</p>
              <p className="text-sm text-muted-foreground">
                {files.length} archivo{files.length !== 1 ? "s" : ""} seleccionado{files.length !== 1 ? "s" : ""}
                {selectedMapping && ` • Mapeo: ${selectedMapping.name}`}
              </p>
            </div>
            <Button onClick={processFiles} disabled={!canProcess}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Procesar archivos"
              )}
            </Button>
          </div>
        </Card>

        {auditResults.length > 0 && (
          <>
            <AuditCalendar auditFiles={auditResults} />
            <AuditDashboard auditFiles={auditResults} />
          </>
        )}
        </div>
      </div>
    </div>
  )
}

