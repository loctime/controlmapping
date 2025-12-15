"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void
  isLoading: boolean
}

export function FileUploadZone({ onFileSelect, isLoading }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  return (
    <Card className="w-full max-w-2xl">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12
          transition-all duration-200
          ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
          }
        `}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">Procesando archivo...</p>
              <p className="text-sm text-muted-foreground">Esto puede tomar unos segundos</p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <FileSpreadsheet className="h-12 w-12 text-primary" />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-2">Sube tu archivo Excel</h3>

            <p className="text-center text-muted-foreground mb-6 max-w-md">
              Arrastra y suelta tu archivo aquí o haz clic en el botón para seleccionar
            </p>

            <div className="flex flex-col items-center gap-3">
              <Button onClick={() => document.getElementById("file-input")?.click()} size="lg" className="gap-2">
                <Upload className="h-5 w-5" />
                Seleccionar archivo
              </Button>

              <p className="text-xs text-muted-foreground">Formatos soportados: .xlsx, .xls</p>
            </div>

            <input id="file-input" type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
          </>
        )}
      </div>
    </Card>
  )
}
