// Tipos específicos del dominio de auditoría

export interface AuditItem {
  pregunta: string
  estado: "cumple" | "cumple_parcial" | "no_cumple" | "no_aplica"
  observaciones?: string
}

export interface AuditTotals {
  totalItems: number
  cumple: number
  cumple_parcial: number
  no_cumple: number
  no_aplica: number
  porcentajeCumplimiento: number
}

export interface AuditFile {
  fileName: string
  headers: Record<string, string | number | Date | null>
  items: AuditItem[]
  totals: AuditTotals
}
