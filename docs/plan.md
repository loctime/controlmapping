Plan Técnico CORREGIDO
Refactorización de ControlMapping a Motor Genérico por Dominio
0. Principio rector (muy importante)

Auditoría no es el core.
El core no sabe qué es una auditoría.
El dominio define el significado.

Este refactor NO agrega features, solo ordena responsabilidades.

1. Diagnóstico (validado)
1.1 Core que ya es genérico (NO TOCAR)

ExcelData, SchemaTemplate, SchemaInstance

Excel Viewer (render fiel)

Mapping Panel / Selector

Value conversion por dataType

CRUD de schemas

Upload de archivos

📌 Regla: si algo funciona con Excel genérico, vive en core.

1.2 Acoplamiento actual a auditoría (a extraer)

parseAudit

Tipos AuditFile / AuditItem / AuditTotals

Dashboards y calendarios

Métricas (cumplimiento, estados)

Detección hardcodeada type === "audit"

📌 Regla: si algo entiende “cumple / no cumple”, es dominio.

2. Arquitectura CORREGIDA (más simple)
APP (routing, composición)
│
├── domains
│     └── audit (lógica + UI)
│
└── core (motor genérico)

Decisión clave

❌ NO framework de plugins
❌ NO registry con UI
✅ registry simple SOLO para lógica (parser)

3. Estructura de carpetas CORREGIDA
/core
  /types
    excel.ts
    mapping.ts
  /components
    excel-viewer.tsx
    mapping-panel.tsx
    file-upload-zone.tsx
  /lib
    firebase.ts
    excel-reader.ts
  /utils
    value-converter.ts

/domains
  /audit
    types.ts
    parser.ts
    config.ts
    index.ts
    /components
      AuditDashboard.tsx
      AuditCalendar.tsx
      OperationDashboard.tsx
      OperatorDashboard.tsx
    /hooks
      useAuditMetrics.ts

/domains-registry.ts   ← SOLO lógica (no UI)

/app
  /mapping
  /process
  /audit

4. DomainType (flexible, sin rigidez temprana)
export type DomainType = string


📌 Regla:

"audit" es una convención

no un enum cerrado todavía

5. Interfaz mínima de dominio (CORREGIDA)
export interface DomainLogic<T = unknown> {
  type: string
  name: string
  parser: (params) => T
}


❌ No UI
❌ No hooks
❌ No magia

6. Registry MINIMALISTA (clave)
const domains = new Map<string, DomainLogic>()

domains.set("audit", auditDomain)

export function getDomain(type?: string) {
  return domains.get(type ?? "audit")
}


📌 El registry:

no renderiza

no conoce React

solo decide qué parser usar

7. Extracción de Auditoría (orden correcto)
Fase 1 — Preparación (sin mover nada)

Crear /domains/audit

Crear registry vacío

App sigue igual

Fase 2 — Extraer lógica (CRÍTICA)

Mover:

AuditFile, AuditItem, AuditTotals

parseAudit

Crear:

domains/audit/parser.ts

domains/audit/config.ts

Alias temporal desde parsers/auditParser.ts

📌 Nada visual todavía.

Fase 3 — Usar registry en /process

Reemplazar:

if (type === "audit") parseAudit()


Por:

const domain = getDomain(schema.type)
domain.parser(...)


📌 Auditoría sigue siendo default.

Fase 4 — Mover UI de auditoría

Dashboards

Calendarios

Métricas

📌 Esto NO afecta el core.

Fase 5 — Limpieza controlada

Eliminar aliases

Verificar imports

Tests manuales

8. Qué NO se hace ahora (muy importante)

❌ No UI genérica por dominio
❌ No selección de dominio en UI
❌ No schemas nuevos
❌ No accounting / legal todavía
❌ No enum rígido de DomainType

9. Señales claras de éxito

✔ core/ no contiene ninguna referencia a auditoría
✔ parseAudit vive solo en domains/audit
✔ process no tiene ifs por dominio
✔ Crear domains/accounting no requiere tocar core
✔ Auditoría funciona exactamente igual

10. Próximo paso DESPUÉS del refactor

Solo cuando esto esté sólido:

Conseguir Excel reales (contabilidad / legal)

Crear domains/accounting

Recién ahí:

selector de dominio

UX diferenciada

templates por rubro