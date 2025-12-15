"use client"

import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Save, RotateCcw, Menu, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"

interface HeaderProps {
  fileName?: string
  mappingsCount: number
  onSaveSchema: () => void
  onReset: () => void
  onToggleMappingPanel: () => void
  isMappingPanelOpen: boolean
  zoom?: number
  onZoomChange?: (zoom: number) => void
}

export function Header({ 
  fileName, 
  mappingsCount, 
  onSaveSchema, 
  onReset,
  onToggleMappingPanel,
  isMappingPanelOpen,
  zoom = 100,
  onZoomChange
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-card shrink-0">
      <div className="flex items-center justify-between px-4 py-2 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground leading-tight">Excel Mapper</h1>
            </div>
          </div>

          {fileName && (
            <>
              <div className="hidden sm:flex items-center gap-2 rounded-md bg-muted px-2 py-1 shrink-0">
                <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{fileName}</span>
              </div>
              <Badge variant="secondary" className="hidden sm:flex shrink-0 text-xs">
                {mappingsCount} {mappingsCount === 1 ? "campo" : "campos"}
              </Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fileName && (
            <>
              {/* Controles de Zoom */}
              {onZoomChange && (
                <div className="hidden md:flex items-center gap-2 px-2 border-r border-border mr-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onZoomChange(Math.max(50, zoom - 10))}
                    className="h-7 w-7 p-0"
                    title="Alejar"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>

                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Slider
                      value={[zoom]}
                      onValueChange={([value]) => onZoomChange(value)}
                      min={50}
                      max={150}
                      step={10}
                      className="w-20"
                    />
                    <span className="text-xs font-medium text-foreground w-10 text-center">{zoom}%</span>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onZoomChange(Math.min(150, zoom + 10))}
                    className="h-7 w-7 p-0"
                    title="Acercar"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onZoomChange(100)}
                    className="h-7 w-7 p-0"
                    title="Resetear zoom"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onToggleMappingPanel}
                className="h-8 px-2 gap-1.5"
              >
                {isMappingPanelOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                <span className="hidden sm:inline">Mapeo</span>
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReset} 
                className="h-8 px-2 gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Nuevo</span>
              </Button>

              <Button 
                onClick={onSaveSchema} 
                disabled={mappingsCount === 0} 
                size="sm" 
                className="h-8 px-2 gap-1.5"
              >
                <Save className="h-3 w-3" />
                <span className="hidden sm:inline">Guardar</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
