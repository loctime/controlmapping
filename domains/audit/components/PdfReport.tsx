import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

// Tipos para los datos calculados del dashboard
interface PdfReportData {
  kpis: {
    totalAuditorias: number
    totalItems: number
    cumplimientoPromedio: number
    totalIncumplimientos: number
  }
  distribucionCumplimiento: Array<{ name: string; value: number; color: string }>
  tendenciaMensual: Array<{ mes: string; cumplimiento: number; cantidad: number }>
  cumplimientoPorAuditoria: Array<{
    auditoria: string
    cumple: number
    cumple_parcial: number
    no_cumple: number
    no_aplica: number
  }>
  rankingOperaciones: Array<{ operacion: string; cumplimiento: number }>
  rankingInversoOperaciones: Array<{ operacion: string; cumplimiento: number }>
  alertasUmbral: {
    bajo70: number
    bajo50: number
    total: number
  }
  executiveSummaryKPIs: string
  executiveSummaryDistribution: string
  executiveSummaryTrend: string
  executiveSummaryAuditorias: string
  executiveSummaryRanking: string
  executiveSummaryRankingInverse: string
  nonComplianceSummary: {
    total: number
    noCumple: number
    cumpleParcial: number
  }
  periodoAnalizado: {
    fechaInicio?: Date
    fechaFin?: Date
  }
}

interface PdfReportProps {
  data: PdfReportData
}

// Estilos del PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1f2937",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 10,
    textAlign: "center",
  },
  date: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 30,
    textAlign: "center",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1f2937",
    borderBottomWidth: 2,
    borderBottomStyle: "solid",
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 15,
    color: "#374151",
  },
  text: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#374151",
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  kpiCard: {
    width: "48%",
    padding: 15,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 15,
  },
  kpiLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  alertCard: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "solid",
  },
  alertCritical: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  alertWarning: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
  },
  alertLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  alertValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: "#f3f4f6",
    fontWeight: "bold",
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 8,
  },
  chartContainer: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  barChart: {
    marginTop: 10,
  },
  bar: {
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 9,
    marginBottom: 3,
    color: "#374151",
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  barFill: {
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  barValue: {
    fontSize: 10,
    fontWeight: "bold",
    minWidth: 50,
  },
  pieChart: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 15,
  },
  pieItem: {
    width: "45%",
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  pieColorBox: {
    width: 15,
    height: 15,
    marginRight: 8,
    borderRadius: 2,
  },
  pieRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  summaryBox: {
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#bae6fd",
    borderRadius: 4,
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1e40af",
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#9ca3af",
  },
})

// Componente para gráfico de barras simple
const SimpleBarChart: React.FC<{
  data: Array<{ label: string; value: number; color?: string }>
  maxValue?: number
}> = ({ data, maxValue }) => {
  const max = maxValue || Math.max(...data.map((d) => d.value))
  const colors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#6b7280"]

  return (
    <View style={styles.barChart}>
      {data.map((item, index) => {
        const width = `${(item.value / max) * 100}%`
        const color = item.color || colors[index % colors.length]
        return (
          <View key={index} style={styles.bar}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.barFill,
                  {
                    width,
                    backgroundColor: color,
                  },
                ]}
              />
              <Text style={styles.barValue}>{item.value.toFixed(1)}%</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

// Componente para gráfico de pie simple (representado como lista)
const SimplePieChart: React.FC<{
  data: Array<{ name: string; value: number; color: string }>
}> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <View style={styles.pieChart}>
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0
        return (
          <View key={index} style={styles.pieItem}>
            <View style={styles.pieRow}>
              <View
                style={[
                  styles.pieColorBox,
                  {
                    backgroundColor: item.color,
                  },
                ]}
              />
              <Text style={{ fontSize: 10, fontWeight: "bold" }}>{item.name}</Text>
            </View>
            <Text style={{ fontSize: 10, marginLeft: 23 }}>
              {item.value.toLocaleString()} ({percentage.toFixed(1)}%)
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export const PdfReport: React.FC<PdfReportProps> = ({ data }) => {
  const fechaGeneracion = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const periodoTexto = data.periodoAnalizado.fechaInicio && data.periodoAnalizado.fechaFin
    ? `${data.periodoAnalizado.fechaInicio.toLocaleDateString("es-AR")} - ${data.periodoAnalizado.fechaFin.toLocaleDateString("es-AR")}`
    : "Período no especificado"

  return (
    <Document>
      {/* Portada */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.title}>Reporte de Auditorías</Text>
          <Text style={styles.subtitle}>Análisis de Cumplimiento</Text>
          <Text style={styles.subtitle}>{periodoTexto}</Text>
          <Text style={styles.date}>Generado el {fechaGeneracion}</Text>
        </View>
      </Page>

      {/* Resumen Ejecutivo */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Resumen Ejecutivo</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{data.executiveSummaryKPIs}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Indicadores Principales</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total de Auditorías</Text>
              <Text style={styles.kpiValue}>{data.kpis.totalAuditorias}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total de Ítems Evaluados</Text>
              <Text style={styles.kpiValue}>{data.kpis.totalItems.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>% Cumplimiento Promedio</Text>
              <Text style={styles.kpiValue}>{data.kpis.cumplimientoPromedio.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total de Incumplimientos</Text>
              <Text style={styles.kpiValue}>{data.kpis.totalIncumplimientos.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
      </Page>

      {/* Atención Prioritaria */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Atención Prioritaria</Text>

          <Text style={styles.subsectionTitle}>Alertas de Cumplimiento</Text>
          {data.alertasUmbral.bajo50 > 0 && (
            <View style={[styles.alertCard, styles.alertCritical]}>
              <Text style={[styles.alertLabel, { color: "#dc2626" }]}>
                Cumplimiento {"<"} 50% (Crítico)
              </Text>
              <Text style={[styles.alertValue, { color: "#dc2626" }]}>
                {data.alertasUmbral.bajo50} auditoría{data.alertasUmbral.bajo50 !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {data.alertasUmbral.bajo70 > 0 && (
            <View style={[styles.alertCard, styles.alertWarning]}>
              <Text style={[styles.alertLabel, { color: "#ea580c" }]}>
                Cumplimiento {"<"} 70% (Atención)
              </Text>
              <Text style={[styles.alertValue, { color: "#ea580c" }]}>
                {data.alertasUmbral.bajo70} auditoría{data.alertasUmbral.bajo70 !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {data.alertasUmbral.total === 0 && (
            <Text style={styles.text}>
              ✓ Todas las auditorías tienen cumplimiento ≥ 70%
            </Text>
          )}

          <Text style={styles.subsectionTitle}>Operaciones que Requieren Atención</Text>
          {data.rankingInversoOperaciones.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <SimpleBarChart
                  data={data.rankingInversoOperaciones.slice(0, 10).map((op) => ({
                    label: op.operacion.substring(0, 30),
                    value: op.cumplimiento,
                    color: op.cumplimiento < 50 ? "#ef4444" : op.cumplimiento < 70 ? "#f97316" : "#eab308",
                  }))}
                  maxValue={100}
                />
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{data.executiveSummaryRankingInverse}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.text}>No hay datos suficientes para generar el ranking.</Text>
          )}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
      </Page>

      {/* Análisis de Cumplimiento Global */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Análisis de Cumplimiento Global</Text>

          <Text style={styles.subsectionTitle}>Distribución de Cumplimiento</Text>
          {data.distribucionCumplimiento.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <SimplePieChart data={data.distribucionCumplimiento} />
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{data.executiveSummaryDistribution}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.text}>No hay datos de distribución disponibles.</Text>
          )}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
      </Page>

      {/* Evolución Temporal */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Evolución Temporal</Text>

          <Text style={styles.subsectionTitle}>Tendencia Mensual de Cumplimiento</Text>
          {data.tendenciaMensual.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <SimpleBarChart
                  data={data.tendenciaMensual.map((t) => ({
                    label: t.mes,
                    value: t.cumplimiento,
                    color: "#3b82f6",
                  }))}
                  maxValue={100}
                />
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{data.executiveSummaryTrend}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.text}>No hay datos de tendencia disponibles.</Text>
          )}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
      </Page>

      {/* Comparación entre Auditorías */}
      {data.cumplimientoPorAuditoria.length > 1 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Comparación entre Auditorías</Text>

            <Text style={styles.subsectionTitle}>Cumplimiento por Auditoría</Text>
            <View style={styles.chartContainer}>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={styles.tableCell}>Auditoría</Text>
                  <Text style={styles.tableCell}>Cumple</Text>
                  <Text style={styles.tableCell}>Parcial</Text>
                  <Text style={styles.tableCell}>No Cumple</Text>
                  <Text style={styles.tableCell}>Total</Text>
                </View>
                {data.cumplimientoPorAuditoria.map((aud, index) => {
                  const total = aud.cumple + aud.cumple_parcial + aud.no_cumple + aud.no_aplica
                  const pctCumplimiento = total > 0
                    ? ((aud.cumple + aud.cumple_parcial) / total) * 100
                    : 0
                  return (
                    <View key={index} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{aud.auditoria.substring(0, 25)}</Text>
                      <Text style={styles.tableCell}>{aud.cumple}</Text>
                      <Text style={styles.tableCell}>{aud.cumple_parcial}</Text>
                      <Text style={styles.tableCell}>{aud.no_cumple}</Text>
                      <Text style={styles.tableCell}>
                        {total} ({pctCumplimiento.toFixed(1)}%)
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{data.executiveSummaryAuditorias}</Text>
            </View>
          </View>

          <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
        </Page>
      )}

      {/* Mejores Desempeños */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Mejores Desempeños</Text>

          <Text style={styles.subsectionTitle}>Top Operaciones por Cumplimiento</Text>
          {data.rankingOperaciones.length > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <SimpleBarChart
                  data={data.rankingOperaciones.slice(0, 10).map((op) => ({
                    label: op.operacion.substring(0, 30),
                    value: op.cumplimiento,
                    color: op.cumplimiento >= 90 ? "#22c55e" : op.cumplimiento >= 70 ? "#eab308" : "#f97316",
                  }))}
                  maxValue={100}
                />
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{data.executiveSummaryRanking}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.text}>No hay datos suficientes para generar el ranking.</Text>
          )}
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
      </Page>

      {/* Resumen de Incumplimientos */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Resumen de Incumplimientos</Text>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total de Incumplimientos</Text>
              <Text style={styles.kpiValue}>{data.nonComplianceSummary.total}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>No Cumple</Text>
              <Text style={[styles.kpiValue, { color: "#dc2626" }]}>
                {data.nonComplianceSummary.noCumple}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Cumple Parcial</Text>
              <Text style={[styles.kpiValue, { color: "#ea580c" }]}>
                {data.nonComplianceSummary.cumpleParcial}
              </Text>
            </View>
          </View>

          <Text style={styles.text}>
            Este resumen incluye todos los ítems identificados como incumplimientos o cumplimientos parciales
            en las auditorías analizadas. Para el detalle completo de cada ítem, consulte los archivos fuente
            de las auditorías.
          </Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
      </Page>
    </Document>
  )
}
