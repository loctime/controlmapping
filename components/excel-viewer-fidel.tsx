"use client"

import { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import type { ExcelData, CellMapping, CellStyle } from "@/types/excel"
import * as XLSX from "xlsx"

interface ExcelViewerFidelProps {
  data: ExcelData
  mappings: CellMapping[]
  selectedCell: string | null
  onCellSelect: (cellId: string) => void
  zoom: number
  onZoomChange: (zoom: number) => void
}

// Función para convertir estilos a CSS inline
const styleToCSS = (style?: CellStyle): string => {
  const cssProps: string[] = []
  const defaultBorder = "1px solid #d0d0d0"
  
  if (style?.fontFamily) cssProps.push(`font-family: ${style.fontFamily}`)
  if (style?.fontSize) cssProps.push(`font-size: ${style.fontSize}`)
  else cssProps.push(`font-size: 11pt`)
  
  if (style?.fontWeight) cssProps.push(`font-weight: ${style.fontWeight}`)
  if (style?.fontStyle) cssProps.push(`font-style: ${style.fontStyle}`)
  if (style?.color) cssProps.push(`color: ${style.color}`)
  else cssProps.push(`color: #000000`)
  
  if (style?.underline) cssProps.push(`text-decoration: underline`)
  
  if (style?.backgroundColor) {
    cssProps.push(`background-color: ${style.backgroundColor}`)
  } else {
    cssProps.push(`background-color: #ffffff`)
  }
  
  if (style?.borderTop) cssProps.push(`border-top: ${style.borderTop}`)
  else cssProps.push(`border-top: ${defaultBorder}`)
  
  if (style?.borderRight) cssProps.push(`border-right: ${style.borderRight}`)
  else cssProps.push(`border-right: ${defaultBorder}`)
  
  if (style?.borderBottom) cssProps.push(`border-bottom: ${style.borderBottom}`)
  else cssProps.push(`border-bottom: ${defaultBorder}`)
  
  if (style?.borderLeft) cssProps.push(`border-left: ${style.borderLeft}`)
  else cssProps.push(`border-left: ${defaultBorder}`)
  
  if (style?.textAlign) cssProps.push(`text-align: ${style.textAlign}`)
  else cssProps.push(`text-align: left`)
  
  if (style?.verticalAlign) cssProps.push(`vertical-align: ${style.verticalAlign}`)
  else cssProps.push(`vertical-align: bottom`)
  
  if (style?.wrapText) {
    cssProps.push(`white-space: normal`)
    cssProps.push(`word-wrap: break-word`)
    cssProps.push(`overflow-wrap: break-word`)
  } else {
    cssProps.push(`white-space: nowrap`)
    cssProps.push(`overflow: hidden`)
    cssProps.push(`text-overflow: ellipsis`)
  }
  
  cssProps.push(`padding: 2px 4px`)
  // No agregar max-width aquí, lo haremos con CSS global
  
  return cssProps.join("; ")
}

const formatCellValue = (value: string | number, style?: CellStyle): string => {
  if (value === null || value === undefined) return ""

  const formatPercent = (num: number) => {
    const pct = num * 100
    return pct.toFixed(2).replace(/\.?0+$/, '') + "%"
  }

  // If style explicitly asks for percent
  if (style?.numFmt && typeof value === 'number') {
    if (String(style.numFmt).includes('%')) return formatPercent(value)
  }

  if (typeof value === 'number') {
    if (Math.abs(value) > 0 && Math.abs(value) < 1) return formatPercent(value)
    return String(value)
  }

  // string
  const s = String(value).trim()
  if (s === '') return ''
  if (s.endsWith('%')) return s
  const n = Number(s.replace(/,/g, ''))
  if (!Number.isNaN(n) && Number.isFinite(n)) {
    if (Math.abs(n) > 0 && Math.abs(n) < 1) return formatPercent(n)
    return String(n)
  }
  return s
}

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function ExcelViewerFidel({ 
  data, 
  mappings, 
  selectedCell, 
  onCellSelect, 
  zoom, 
  onZoomChange 
}: ExcelViewerFidelProps) {
  const excelTableRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<number | null>(null)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const isScrollingRef = useRef(false)

  const sheet = data.sheets[0]
  
  // Memoizar mappings por cellId para búsqueda rápida
  const mappingsMap = useMemo(() => {
    const map = new Map<string, CellMapping>()
    mappings.forEach(m => map.set(m.cellId, m))
    return map
  }, [mappings])

  // Construir HTML fiel del Excel
  const buildExcelHTML = useCallback(() => {
    if (!sheet || !sheet.cells) return ""

    let minRow = Infinity
    let maxRow = 0
    let minCol = Infinity
    let maxCol = 0
    
    Object.keys(sheet.cells).forEach(addr => {
      const cell = XLSX.utils.decode_cell(addr)
      if (cell.r < minRow) minRow = cell.r
      if (cell.r > maxRow) maxRow = cell.r
      if (cell.c < minCol) minCol = cell.c
      if (cell.c > maxCol) maxCol = cell.c
    })
    
    if (sheet.merges) {
      sheet.merges.forEach(merge => {
        const [start, end] = merge.split(":")
        const startCell = XLSX.utils.decode_cell(start)
        const endCell = XLSX.utils.decode_cell(end)
        if (startCell.r < minRow) minRow = startCell.r
        if (endCell.r > maxRow) maxRow = endCell.r
        if (startCell.c < minCol) minCol = startCell.c
        if (endCell.c > maxCol) maxCol = endCell.c
      })
    }
    
    const startRow = minRow === Infinity ? 0 : minRow
    const endRow = maxRow
    const startCol = minCol === Infinity ? 0 : minCol
    const endCol = maxCol

    const mergeMap = new Map<string, { rowspan: number; colspan: number }>()
    if (sheet.merges) {
      sheet.merges.forEach(merge => {
        const [start, end] = merge.split(":")
        const startCell = XLSX.utils.decode_cell(start)
        const endCell = XLSX.utils.decode_cell(end)
        const rowspan = endCell.r - startCell.r + 1
        const colspan = endCell.c - startCell.c + 1
        mergeMap.set(start, { rowspan, colspan })
      })
    }

    const mergedCells = new Set<string>()
    if (sheet.merges) {
      sheet.merges.forEach(merge => {
        const [start, end] = merge.split(":")
        const startCell = XLSX.utils.decode_cell(start)
        const endCell = XLSX.utils.decode_cell(end)
        for (let r = startCell.r; r <= endCell.r; r++) {
          for (let c = startCell.c; c <= endCell.c; c++) {
            if (r !== startCell.r || c !== startCell.c) {
              mergedCells.add(XLSX.utils.encode_cell({ r, c }))
            }
          }
        }
      })
    }
    
    const cellsToRender = new Map<string, { cell: any; mergeInfo?: { rowspan: number; colspan: number } }>()
    
    Object.keys(sheet.cells).forEach(addr => {
      const cell = sheet.cells[addr]
      if (cell) {
        cellsToRender.set(addr, { cell })
      }
    })
    
    mergeMap.forEach((mergeInfo, addr) => {
      if (cellsToRender.has(addr)) {
        cellsToRender.get(addr)!.mergeInfo = mergeInfo
      } else {
        cellsToRender.set(addr, { cell: null, mergeInfo })
      }
    })
    
    const cellsByRow = new Map<number, Map<number, { addr: string; cell: any; mergeInfo?: any }>>()
    cellsToRender.forEach((data, addr) => {
      const pos = XLSX.utils.decode_cell(addr)
      if (!cellsByRow.has(pos.r)) {
        cellsByRow.set(pos.r, new Map())
      }
      cellsByRow.get(pos.r)!.set(pos.c, { addr, ...data })
    })
    
    let html = `<table data-excel-table style="border-collapse: collapse; table-layout: auto; width: auto; font-family: 'Segoe UI', Calibri, Arial, sans-serif;">`
    html += `<tbody>`

    for (let R = startRow; R <= endRow; R++) {
      const rowCells = cellsByRow.get(R)
      if (!rowCells || rowCells.size === 0) continue
      
      html += `<tr>`
      
      for (let C = startCol; C <= endCol; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        
        if (mergedCells.has(cellAddress)) {
          continue
        }
        
        const cellData = rowCells?.get(C)
        
        if (cellData) {
          const cell = cellData.cell || sheet.cells[cellAddress]
          const style = cell?.style || {}
          const css = styleToCSS(style)
          const value = cell?.value !== undefined ? formatCellValue(cell.value, style) : ""
          
          const rowspan = cellData.mergeInfo?.rowspan || 1
          const colspan = cellData.mergeInfo?.colspan || 1
          
          const styleAttr = ` style="${css}"`
          const rowspanAttr = rowspan > 1 ? ` rowspan="${rowspan}"` : ""
          const colspanAttr = colspan > 1 ? ` colspan="${colspan}"` : ""
          const dataCellId = ` data-cell-id="${cellAddress}"`
          
          const displayValue = typeof value === "string" ? escapeHtml(value) : value
          // Agregar title para mostrar texto completo al hacer hover
          const titleAttr = typeof value === "string" && value.length > 50 ? ` title="${escapeHtml(String(value))}"` : ""
          html += `<td${dataCellId}${styleAttr}${rowspanAttr}${colspanAttr}${titleAttr}>${displayValue}</td>`
        }
      }
      html += `</tr>`
    }

    html += `</tbody></table>`
    return html
  }, [sheet])
  
  const excelHTML = useMemo(() => {
    return buildExcelHTML()
  }, [buildExcelHTML])
  
  // Event delegation con corrección para transform scale
  useEffect(() => {
    if (!excelTableRef.current) return

    const container = excelTableRef.current
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Buscar la celda más cercana con data-cell-id
      const cell = target.closest("[data-cell-id]") as HTMLElement
      if (cell) {
        const cellId = cell.getAttribute("data-cell-id")
        if (cellId) {
          console.log("✅ Celda clickeada:", cellId, "Valor:", cell.textContent?.trim()) // Debug
          onCellSelect(cellId)
        }
      }
    }

    const handleMouseOver = (e: MouseEvent) => {
      if (hoverTimeoutRef.current) {
        cancelAnimationFrame(hoverTimeoutRef.current)
      }
      hoverTimeoutRef.current = requestAnimationFrame(() => {
        const target = e.target as HTMLElement
        const cell = target.closest("[data-cell-id]") as HTMLElement
        if (cell) {
          const cellId = cell.getAttribute("data-cell-id")
          if (cellId) {
            setHoveredCell(cellId)
          }
        }
        hoverTimeoutRef.current = null
      })
    }

    const handleMouseOut = () => {
      setHoveredCell(null)
    }

    // Esperar un momento para asegurar que el HTML se haya renderizado
    const timeoutId = setTimeout(() => {
      const table = container.querySelector("table")
      if (!table) {
        console.log("⚠️ No se encontró la tabla")
        return
      }
      
      console.log("✅ Tabla encontrada, registrando eventos")

      // Agregar eventos directamente al contenedor para mejor captura
      container.addEventListener("click", handleClick)
      container.addEventListener("mouseover", handleMouseOver)
      container.addEventListener("mouseout", handleMouseOut)

      // Asegurar estilos para que las celdas sean clickeables
      let style = document.getElementById("excel-table-styles") as HTMLStyleElement
      if (!style) {
        style = document.createElement("style")
        style.id = "excel-table-styles"
        style.textContent = `
        table[data-excel-table] {
          pointer-events: auto !important;
        }
        table[data-excel-table] [data-cell-id] {
          pointer-events: auto !important;
          cursor: pointer !important;
          position: relative !important;
          user-select: none !important;
        }
        table[data-excel-table] td {
          max-width: 400px !important;
          min-width: 80px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        table[data-excel-table] td[colspan] {
          max-width: none !important;
        }
        .excel-table-container {
          pointer-events: auto !important;
        }
      `
        document.head.appendChild(style)
      }
      
      table.setAttribute("data-excel-table", "true")
    }, 100) // Pequeño delay para asegurar renderizado

    return () => {
      clearTimeout(timeoutId)
      container.removeEventListener("click", handleClick)
      container.removeEventListener("mouseover", handleMouseOver)
      container.removeEventListener("mouseout", handleMouseOut)
      if (hoverTimeoutRef.current) {
        cancelAnimationFrame(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
    }
  }, [onCellSelect, excelHTML])

  // Actualizar estilos visuales
  useEffect(() => {
    if (!excelTableRef.current) return

    const table = excelTableRef.current.querySelector("table")
    if (!table) return

    const rafId = requestAnimationFrame(() => {
      const cellsToUpdate = new Set<string>()
      if (selectedCell) cellsToUpdate.add(selectedCell)
      if (hoveredCell) cellsToUpdate.add(hoveredCell)
      mappings.forEach(m => cellsToUpdate.add(m.cellId))

      if (cellsToUpdate.size === 0) return

      cellsToUpdate.forEach(cellId => {
        const cell = table.querySelector<HTMLElement>(`[data-cell-id="${cellId}"]`)
        if (!cell) return

        const isSelected = selectedCell === cellId
        const isMapped = mappingsMap.has(cellId)
        const isHovered = hoveredCell === cellId

        cell.style.boxShadow = ""
        cell.style.zIndex = ""

        if (isSelected) {
          cell.style.boxShadow = "inset 0 0 0 3px rgba(59, 130, 246, 0.5), 0 0 0 2px rgba(59, 130, 246, 1)"
          cell.style.zIndex = "30"
        } else if (isMapped) {
          cell.style.boxShadow = "inset 0 0 0 2px rgba(96, 165, 250, 0.4)"
          cell.style.zIndex = "20"
        } else if (isHovered) {
          cell.style.boxShadow = "inset 0 0 0 1px rgba(156, 163, 175, 0.5)"
          cell.style.zIndex = "10"
        }
      })
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [selectedCell, hoveredCell, mappingsMap, mappings])

  const getMappingLabel = useCallback((cellId: string) => {
    return mappingsMap.get(cellId)?.label
  }, [mappingsMap])

  // Sincronizar scroll horizontal entre barras superior e inferior
  useEffect(() => {
    const topScroll = topScrollRef.current
    const bottomScroll = bottomScrollRef.current
    const excelContainer = excelTableRef.current

    if (!topScroll || !bottomScroll || !excelContainer) return

    // Sincronizar el ancho de la barra superior con el contenido
    const syncWidth = () => {
      const table = excelContainer.querySelector('table')
      if (table) {
        const scrollContent = topScroll.querySelector('div')
        if (scrollContent) {
          // Obtener el ancho real del contenido escalado
          const tableWidth = table.scrollWidth
          const scaledWidth = tableWidth * (zoom / 100)
          scrollContent.style.width = `${scaledWidth}px`
        }
      }
    }

    // Sincronizar scroll
    const handleTopScroll = () => {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true
        bottomScroll.scrollLeft = topScroll.scrollLeft
        requestAnimationFrame(() => {
          isScrollingRef.current = false
        })
      }
    }

    const handleBottomScroll = () => {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true
        topScroll.scrollLeft = bottomScroll.scrollLeft
        requestAnimationFrame(() => {
          isScrollingRef.current = false
        })
      }
    }

    // Sincronizar ancho inicial y cuando cambia el zoom
    syncWidth()
    const resizeObserver = new ResizeObserver(() => {
      syncWidth()
    })
    resizeObserver.observe(excelContainer)

    topScroll.addEventListener('scroll', handleTopScroll)
    bottomScroll.addEventListener('scroll', handleBottomScroll)

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll)
      bottomScroll.removeEventListener('scroll', handleBottomScroll)
      resizeObserver.disconnect()
    }
  }, [excelHTML, zoom])

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-muted/30 relative">
      {/* Barra de scroll horizontal superior */}
      {excelHTML && excelHTML.trim() !== "" && (
        <div 
          ref={topScrollRef}
          className="overflow-x-auto overflow-y-hidden border-b border-border bg-muted/50 custom-scrollbar-top"
          style={{ 
            height: '20px',
            padding: '0 20px'
          }}
        >
          <div 
            style={{ 
              height: '1px',
              width: '100%',
              minWidth: 'max-content'
            }} 
          />
        </div>
      )}

      {/* Excel Container - Sin padding, ocupa todo el espacio */}
      <div 
        ref={bottomScrollRef}
        className="flex-1 overflow-auto relative custom-scrollbar" 
        style={{ padding: '20px' }}
      >
        {!excelHTML || excelHTML.trim() === "" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg font-medium text-foreground mb-2">No hay datos para mostrar</p>
              <p className="text-sm text-muted-foreground">El archivo Excel parece estar vacío o no se pudo procesar correctamente.</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top left",
              display: "inline-block",
              pointerEvents: "auto",
            }}
          >
            <div className="relative inline-block bg-white border border-border rounded-lg shadow-sm" style={{ pointerEvents: "auto", width: "100%" }}>
              <div
                ref={excelTableRef}
                className="excel-table-container"
                dangerouslySetInnerHTML={{ __html: excelHTML }}
                style={{ userSelect: "none", pointerEvents: "auto" }}
              />

              {selectedCell && getMappingLabel(selectedCell) && (
                <div className="absolute pointer-events-none z-50 top-2 left-2">
                  <Badge className="bg-primary text-primary-foreground">
                    {getMappingLabel(selectedCell)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


