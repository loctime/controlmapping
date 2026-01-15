# Dominio de Eventos Vehiculares

Este dominio maneja eventos automáticos de telemetría vehicular (log de eventos).

## Schema: `vehiculo_eventos_v1`

El schema `vehiculo_eventos_v1` representa una fila del Excel donde cada fila es un evento con las siguientes columnas:

### Campos del Schema

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `fecha` | `date` | ✅ Sí | Fecha y hora del evento |
| `latitud` | `number` | ✅ Sí | Coordenada de latitud |
| `longitud` | `number` | ✅ Sí | Coordenada de longitud |
| `vehiculo` | `string` | ❌ No | Identificación del vehículo |
| `direccion` | `string` | ❌ No | Dirección donde ocurrió el evento |
| `velocidad` | `number` | ❌ No | Velocidad del vehículo en el momento del evento |
| `llave` | `string` | ❌ No | Identificador único o llave del evento |
| `operador` | `string` | ❌ No | Nombre o identificación del operador |
| `evento` | `string` | ✅ Sí | Tipo de evento (ej: "Microsueño", "Exceso de velocidad", etc.) |
| `texto` | `string` | ❌ No | Texto adicional del evento |
| `descripcion` | `string` | ❌ No | Descripción detallada del evento |
| `mapa` | `string` | ❌ No | URL del mapa asociado al evento |

## Uso

### 1. Importar el schema y el parser

```typescript
import { VEHICULO_EVENTOS_V1_SCHEMA } from "@/domains/vehiculo/config"
import { parseVehiculoEventos, filtrarEventosPorTipo, obtenerTiposEvento } from "@/domains/vehiculo"
import { saveSchemaTemplate } from "@/lib/firebase"
```

### 2. Guardar el schema en Firebase (una sola vez)

```typescript
// Guardar el schema template en Firebase
await saveSchemaTemplate(VEHICULO_EVENTOS_V1_SCHEMA)
```

### 3. Mapear columnas del Excel

En la página de mapping (`/mapping`), selecciona el schema `vehiculo_eventos_v1` y mapea cada columna del Excel a los campos correspondientes.

### 4. Procesar archivos Excel

```typescript
import { getDomain } from "@/domains/registry"
import "@/domains/vehiculo" // Registrar el dominio

const domain = getDomain("vehiculo")
const resultado = domain.parser(excelData, schemaTemplate, schemaInstance)
// resultado es de tipo VehiculoEventosFile
```

### 5. Filtrar eventos por tipo

```typescript
import { filtrarEventosPorTipo } from "@/domains/vehiculo"

// Filtrar eventos de tipo "Microsueño"
const eventosMicrosueño = filtrarEventosPorTipo(resultado.eventos, "Microsueño")

// Obtener lista de tipos de eventos únicos
const tiposEvento = obtenerTiposEvento(resultado.eventos)
// tiposEvento = ["Microsueño", "Exceso de velocidad", ...]
```

## Estructura de Datos

### VehiculoEvento

```typescript
interface VehiculoEvento {
  fecha: Date
  latitud: number
  longitud: number
  vehiculo: string
  direccion: string
  velocidad: number
  llave: string
  operador: string
  evento: string // Tipo de evento
  texto: string
  descripcion: string
  mapa: string // URL
}
```

### VehiculoEventosFile

```typescript
interface VehiculoEventosFile {
  fileName: string
  eventos: VehiculoEvento[]
  totalEventos: number
  tiposEvento: string[] // Lista única de tipos de eventos
}
```

## Ejemplo Completo

```typescript
import { VEHICULO_EVENTOS_V1_SCHEMA } from "@/domains/vehiculo/config"
import { parseVehiculoEventos, filtrarEventosPorTipo } from "@/domains/vehiculo"
import type { ExcelData, SchemaInstance } from "@/types/excel"

// Procesar un archivo Excel
const excelData: ExcelData = { /* ... */ }
const schemaInstance: SchemaInstance = { /* ... */ }

const resultado = parseVehiculoEventos(
  excelData,
  VEHICULO_EVENTOS_V1_SCHEMA,
  schemaInstance
)

console.log(`Total de eventos: ${resultado.totalEventos}`)
console.log(`Tipos de eventos: ${resultado.tiposEvento.join(", ")}`)

// Filtrar eventos de tipo "Microsueño"
const microsueños = filtrarEventosPorTipo(resultado.eventos, "Microsueño")
console.log(`Eventos de Microsueño: ${microsueños.length}`)
```
