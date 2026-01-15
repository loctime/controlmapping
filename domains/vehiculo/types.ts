// Tipos específicos del dominio de eventos vehiculares

export interface VehiculoEvento {
  fecha: Date
  latitud: number
  longitud: number
  vehiculo: string
  direccion: string
  velocidad: number
  llave: string
  operador: string
  evento: string // Tipo de evento (ej: "Microsueño", "Exceso de velocidad", etc.)
  texto: string
  descripcion: string
  mapa: string // URL del mapa
}

export interface VehiculoEventosFile {
  fileName: string
  eventos: VehiculoEvento[]
  totalEventos: number
  tiposEvento: string[] // Lista única de tipos de eventos encontrados
}
