// Registry mínimo para mapear domainType → parser
// Solo maneja lógica, no UI ni hooks

export type DomainType = string // Flexible, sin enum rígido

export interface DomainLogic<T = unknown> {
  type: string
  name: string
  parser: (
    excelData: any,
    schemaTemplate: any,
    schemaInstance: any
  ) => T
}

const domains = new Map<string, DomainLogic>()

export function getDomain(type?: string): DomainLogic | undefined {
  // Fallback a "audit" si no se especifica tipo
  return domains.get(type ?? "audit")
}

// Esta función será llamada desde domains/audit/index.ts para registrar el dominio
export function registerDomain(domain: DomainLogic) {
  domains.set(domain.type, domain)
}
