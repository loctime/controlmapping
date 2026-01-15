import type { ExcelData, SchemaTemplate, SchemaInstance } from "@/types/excel"
import type { DomainLogic } from "../registry"
import { parseAudit } from "./parser"
import type { AuditFile } from "./types"
import { registerDomain } from "../registry"

export const auditDomain: DomainLogic<AuditFile> = {
  type: "audit",
  name: "Auditoría",
  parser: parseAudit
}

// Registrar el dominio automáticamente al importar este módulo
registerDomain(auditDomain)

// Re-exportar tipos y parser para uso directo
export { parseAudit }
export type { AuditFile, AuditItem, AuditTotals } from "./types"
