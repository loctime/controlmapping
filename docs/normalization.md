# Normalización de datos — Fuente única de verdad

Este documento define los normalizadores oficiales del sistema,
las reglas de delegación por capa (base, dominio, UI)
y clasifica la deuda técnica existente.

---

## Normalizadores oficiales (Categoría A)
...
1) Normalizadores oficiales (fuente única de verdad)
Regla: solo funciones de categoría A.

✅ Normalizadores base oficiales (A)
1. utils/date.ts
excelNumberToDate → Normalizador oficial de serial Excel → Date.

normalizeDate → Normalizador oficial de fechas genéricas (string | number | Date) → Date | null.

2. src/lib/excel/date-parser.ts
parseExcelDate → Normalizador oficial de parsing de fechas Excel/ISO/numéricas/texto español a string normalizado DD/MM[/YYYY] con confianza.

Declaración final:
Estos son los normalizadores oficiales del sistema y toda lógica de normalización de fechas debe delegar en ellos.

2) Categoría B (normalizadores de dominio): separación conceptual
B.1 domains/audit/parser.ts
a) convertToDate
Parte base (normalización):

Depende de parseExcelDate para detectar y normalizar entrada a formato DD/MM[/YYYY].

Parte dominio (regla de negocio):

Decide convertir a Date solo si confidence !== "low" y define año por defecto con new Date().getFullYear() si no hay año.

Delegación recomendada (conceptual):

El parseo debe delegar en parseExcelDate (oficial A).

La decisión de confianza y default de año es regla de dominio.

b) convertToNumber
Parte base (normalización):

Limpieza de separadores ,, espacios y parseFloat.

Parte dominio (regla de negocio):

Aceptación de number finito y retorno null si no es válido; se asume el set de tipos esperados del dominio.

Delegación recomendada (conceptual):

La limpieza numérica podría delegar a un normalizador base (no existe aún fuera de A).

Nota: hoy no hay A para números, por lo que queda como dominio.

c) convertToPercentage
Parte base (normalización):

Limpieza de %, ,, espacios y parseFloat.

Parte dominio (regla de negocio):

Heurística de porcentajes:

si 0–1 → *100;

si string contiene % → ya es porcentaje;

si 1–100 → ya es porcentaje;

fuera de rango → null.

Delegación recomendada (conceptual):

Limpieza numérica debería delegar a normalizador base (si existiera).

La heurística de rango es regla de negocio del dominio.

B.2 domains/vehiculo/parser.ts
a) convertToDate
Parte base: parseo con parseExcelDate (oficial).

Parte dominio: criterio confidence !== "low" y default de año con new Date().getFullYear().【F:domains/vehiculo/parser.ts†L86-L97

Delegación conceptual: base a parseExcelDate; reglas de confianza/año son de dominio.

b) convertToNumber
Parte base: limpieza ,, espacios, parseFloat.

Parte dominio: validación finita y retorno null.

Delegación conceptual: limpieza numérica a un normalizador base (a definir a futuro).

3) Categoría C (duplicaciones) → delegación conceptual a oficiales
C.1 Porcentaje en headers (getCumplimientoPct)
Archivos duplicados:

components/audit-dashboard.tsx

domains/audit/hooks/useAuditMetrics.ts

components/result-table.tsx

domains/audit/components/dashboardHelpers.ts

domains/audit/components/OperatorDashboard.tsx

Delegación conceptual:

A oficiales: ninguno directo, porque no hay normalizador base oficial de porcentaje en categoría A.

Plan conceptual: estas normalizaciones deberían delegar en un normalizador base futuro de porcentajes (aún no existe).

Mientras tanto: podrían delegar al normalizador de dominio convertToPercentage de domains/audit/parser.ts (categoría B).

C.2 Número genérico en headers (getHeaderNumber)
Archivos duplicados:

components/audit-dashboard.tsx

domains/audit/hooks/useAuditMetrics.ts

components/result-table.tsx

domains/audit/components/dashboardHelpers.ts

Delegación conceptual:

A oficiales: ninguno directo (no hay normalizador base numérico A).

Plan conceptual: delegar a un normalizador base futuro de números.

Mientras tanto: delegar a convertToNumber en dominio audit (B).

C.3 Excel → Date (parseExcelDate + new Date)
Duplicados:

domains/audit/parser.ts → convertToDate

domains/vehiculo/parser.ts → convertToDate

app/process/page.tsx → excelDateToJSDate

Delegación conceptual:

A oficiales: parseExcelDate + normalizeDate como base.

El criterio de confianza y default de año queda como regla de dominio.

C.4 Heurística % y decimal < 1 en UI
Duplicados:

components/excel-viewer.tsx → formatCellDisplay

components/excel-viewer-fidel.tsx → formatCellValue

components/flotante-mapping-panel.tsx → renderValue

Delegación conceptual:

A oficiales: no aplica; es formateo de presentación.

Nota: no debería delegar a normalizadores base de datos, porque es UI.

4) Categoría D → Formateo UI permitido vs Normalización impropia
D.1 Formateo UI permitido
Normalización usada exclusivamente para display.

components/excel-viewer.tsx → formatCellDisplay (porcentajes y formato visual).

components/excel-viewer-fidel.tsx → formatCellValue (igual objetivo visual).

components/flotante-mapping-panel.tsx → renderValue (formateo visual).

components/event-log/KpiCard.tsx → formatPatentForDisplay (display de patente).

Motivo: son transformaciones de presentación, no de normalización de datos persistentes.

D.2 Normalización impropia (a eliminar a futuro)
Normalización de datos crudos en UI/hooks/pages.

app/process/page.tsx → normalizeHeaderDate (normalización de fecha en page).

app/process/page.tsx → excelDateToJSDate (parseo Excel en page).

app/process/page.tsx → parseo de porcentaje cumplimientoRaw (page).

components/audit-dashboard.tsx → getCumplimientoPct / getHeaderNumber.

components/result-table.tsx → getCumplimientoPct / getHeaderNumber.

domains/audit/hooks/useAuditMetrics.ts → getCumplimientoPct / getHeaderNumber.

domains/audit/components/OperatorDashboard.tsx → getCumplimientoPct.

app/dashboard/operator/[operatorId]/page.tsx → new Date(...) al rehidratar headers.fecha.

app/dashboard/operation/[operationId]/page.tsx → new Date(...) al rehidratar headers.fecha.

components/event-log/securityAlerts.ts → normalización de fecha por día con new Date y toISOString para key.

Motivo: son normalizaciones de datos persistentes/analíticos realizadas fuera de capa base/dominio.

✅ Declaración final (objetivo del documento)
Estos son los normalizadores oficiales del sistema y todo lo demás debe delegar en ellos:

excelNumberToDate (serial Excel → Date).

normalizeDate (string/number/Date → Date | null).

parseExcelDate (parseo robusto de fechas Excel/ISO/texto).

Fuera de estos, toda lógica de normalización:

en dominio debe actuar como wrapper con reglas propias (confianza, defaults, rangos).

en UI/hooks/pages debe evitarse salvo si es formateo visual.

