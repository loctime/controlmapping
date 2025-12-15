"use client"

import { useRef, useState } from "react"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { ExcelData, CellMapping } from "@/types/excel"

interface ExcelViewerProps {
  data: ExcelData
  mappings: CellMapping[]
  selectedCell: string | null
  onCellSelect: (cellId: string) => void
  zoom: number
  onZoomChange: (zoom: number) => void
}

export function ExcelViewer({ data, mappings, selectedCell, onCellSelect, zoom, onZoomChange }: ExcelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  const sheet = data.sheets[0] // Using first sheet for simplicity
  const cols = Array.from({ length: sheet.cols }, (_, i) => String.fromCharCode(65 + i))
  const rows = Array.from({ length: sheet.rows }, (_, i) => i + 1)

  const getCellStyle = (cellId: string) => {
    const cell = sheet.cells[cellId]
    const baseStyle = cell?.style || {}
    const isMapped = mappings.some((m) => m.cellId === cellId)
    const isSelected = selectedCell === cellId
    const isHovered = hoveredCell === cellId

    return {
      ...baseStyle,
      backgroundColor: isSelected
        ? "var(--selection-highlight)"
        : isMapped
          ? "var(--selection-highlight)"
          : isHovered
            ? "var(--cell-hover)"
            : baseStyle.backgroundColor,
      outline: isSelected
        ? "2px solid var(--selection-border)"
        : isMapped
          ? "1px solid var(--selection-border)"
          : "none",
      outlineOffset: "-1px",
      cursor: "pointer",
    }
  }

  const getMappingLabel = (cellId: string) => {
    return mappings.find((m) => m.cellId === cellId)?.label
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Vista del Excel</span>
          <span className="text-xs text-muted-foreground">
            {sheet.name} • {sheet.rows} filas × {sheet.cols} columnas
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => onZoomChange(Math.max(50, zoom - 10))}>
            <ZoomOut className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-[150px]">
            <Slider
              value={[zoom]}
              onValueChange={([value]) => onZoomChange(value)}
              min={50}
              max={150}
              step={10}
              className="flex-1"
            />
            <span className="text-sm font-medium text-foreground w-12 text-center">{zoom}%</span>
          </div>

          <Button variant="outline" size="sm" onClick={() => onZoomChange(Math.min(150, zoom + 10))}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={() => onZoomChange(100)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            display: "inline-block",
            minWidth: "100%",
          }}
        >
          <div className="inline-block bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-muted border border-border w-12 h-8 text-xs font-medium text-muted-foreground"></th>
                  {cols.map((col) => (
                    <th
                      key={col}
                      className="sticky top-0 z-10 bg-muted border border-border min-w-[120px] h-8 px-2 text-xs font-medium text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row}>
                    <td className="sticky left-0 z-10 bg-muted border border-border w-12 h-8 text-center text-xs font-medium text-muted-foreground">
                      {row}
                    </td>
                    {cols.map((col) => {
                      const cellId = `${col}${row}`
                      const cell = sheet.cells[cellId]
                      const label = getMappingLabel(cellId)

                      return (
                        <td
                          key={cellId}
                          onClick={() => onCellSelect(cellId)}
                          onMouseEnter={() => setHoveredCell(cellId)}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={getCellStyle(cellId)}
                          className="relative border border-border min-w-[120px] h-8 px-2 text-sm text-foreground transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{cell?.value || ""}</span>
                            {label && (
                              <span className="shrink-0 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {label}
                              </span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
