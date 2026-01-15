import type { SchemaTemplate } from "@/types/excel"

/**
 * Schema Template para eventos vehiculares (telemetría)
 * Cada fila del Excel representa un evento con todas sus propiedades
 */
export const VEHICULO_EVENTOS_V1_SCHEMA: SchemaTemplate = {
  schemaId: "vehiculo_eventos_v1",
  name: "Eventos Vehiculares v1",
  description: "Schema para eventos automáticos de telemetría vehicular (log de eventos)",
  version: 1,
  type: "vehiculo",
  headerFields: [], // No hay campos de encabezado, todo está en la tabla
  table: {
    description: "Tabla de eventos vehiculares. Cada fila representa un evento.",
    columns: [
      {
        role: "fecha",
        label: "Fecha",
        required: true,
        dataType: "date",
        description: "Fecha y hora del evento"
      },
      {
        role: "latitud",
        label: "Latitud",
        required: true,
        dataType: "number",
        description: "Coordenada de latitud"
      },
      {
        role: "longitud",
        label: "Longitud",
        required: true,
        dataType: "number",
        description: "Coordenada de longitud"
      },
      {
        role: "vehiculo",
        label: "Vehículo",
        required: false,
        dataType: "string",
        description: "Identificación del vehículo"
      },
      {
        role: "direccion",
        label: "Dirección",
        required: false,
        dataType: "string",
        description: "Dirección donde ocurrió el evento"
      },
      {
        role: "velocidad",
        label: "Velocidad",
        required: false,
        dataType: "number",
        description: "Velocidad del vehículo en el momento del evento"
      },
      {
        role: "llave",
        label: "Llave",
        required: false,
        dataType: "string",
        description: "Identificador único o llave del evento"
      },
      {
        role: "operador",
        label: "Operador",
        required: false,
        dataType: "string",
        description: "Nombre o identificación del operador"
      },
      {
        role: "evento",
        label: "Evento",
        required: true,
        dataType: "string",
        description: "Tipo de evento (ej: 'Microsueño', 'Exceso de velocidad', etc.)"
      },
      {
        role: "texto",
        label: "Texto",
        required: false,
        dataType: "string",
        description: "Texto adicional del evento"
      },
      {
        role: "descripcion",
        label: "Descripción",
        required: false,
        dataType: "string",
        description: "Descripción detallada del evento"
      },
      {
        role: "mapa",
        label: "Mapa",
        required: false,
        dataType: "string",
        description: "URL del mapa asociado al evento"
      }
    ]
  }
}
