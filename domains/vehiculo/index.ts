import type { ExcelData, SchemaTemplate, SchemaInstance } from "@/types/excel"
import type { DomainLogic } from "../registry"
import { parseVehiculoEventos } from "./parser"
import type { VehiculoEventosFile } from "./types"
import { registerDomain } from "../registry"
import { VEHICULO_EVENTOS_V1_SCHEMA } from "./config"

export const vehiculoDomain: DomainLogic<VehiculoEventosFile> = {
  type: "vehiculo",
  name: "Eventos Vehiculares",
  parser: parseVehiculoEventos
}

// Registrar el dominio automáticamente al importar este módulo
registerDomain(vehiculoDomain)

// Re-exportar tipos, parser y schema para uso directo
export { parseVehiculoEventos, filtrarEventosPorTipo, obtenerTiposEvento } from "./parser"
export type { VehiculoEvento, VehiculoEventosFile } from "./types"
export { VEHICULO_EVENTOS_V1_SCHEMA }
