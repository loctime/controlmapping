import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { VehiculoEventosFile } from "@/domains/vehiculo/types"
import type { SecurityAlert } from "./securityAlerts"

interface VehiculoEventosPdfReportProps {
  data: VehiculoEventosFile[]
  securityAlert: SecurityAlert
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
  alertBanner: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 4,
    borderWidth: 2,
    borderStyle: "solid",
  },
  alertCritical: {
    backgroundColor: "#fef2f2",
    borderColor: "#dc2626",
  },
  alertHigh: {
    backgroundColor: "#fff7ed",
    borderColor: "#ea580c",
  },
  alertMedium: {
    backgroundColor: "#fefce8",
    borderColor: "#eab308",
  },
  alertOK: {
    backgroundColor: "#f0fdf4",
    borderColor: "#22c55e",
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  alertMessage: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 5,
  },
  alertBadge: {
    fontSize: 10,
    fontWeight: "bold",
    padding: 4,
    borderRadius: 2,
    textAlign: "center",
    marginTop: 5,
  },
  badgeCritical: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
  },
  badgeHigh: {
    backgroundColor: "#ea580c",
    color: "#ffffff",
  },
  badgeMedium: {
    backgroundColor: "#eab308",
    color: "#ffffff",
  },
  badgeOK: {
    backgroundColor: "#22c55e",
    color: "#ffffff",
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

function getAlertStyles(severity: SecurityAlert["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return {
        banner: styles.alertCritical,
        title: { color: "#dc2626" },
        message: { color: "#991b1b" },
        badge: [styles.alertBadge, styles.badgeCritical],
      }
    case "HIGH":
      return {
        banner: styles.alertHigh,
        title: { color: "#ea580c" },
        message: { color: "#c2410c" },
        badge: [styles.alertBadge, styles.badgeHigh],
      }
    case "MEDIUM":
      return {
        banner: styles.alertMedium,
        title: { color: "#eab308" },
        message: { color: "#a16207" },
        badge: [styles.alertBadge, styles.badgeMedium],
      }
    case "OK":
      return {
        banner: styles.alertOK,
        title: { color: "#22c55e" },
        message: { color: "#15803d" },
        badge: [styles.alertBadge, styles.badgeOK],
      }
  }
}

function getSeverityLabel(severity: SecurityAlert["severity"]): string {
  switch (severity) {
    case "CRITICAL":
      return "CRÍTICA"
    case "HIGH":
      return "ALTA"
    case "MEDIUM":
      return "MEDIA"
    case "OK":
      return "OK"
  }
}

export const VehiculoEventosPdfReport: React.FC<VehiculoEventosPdfReportProps> = ({
  data,
  securityAlert,
}) => {
  const fechaGeneracion = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const totalEventos = data.reduce((sum, file) => sum + file.totalEventos, 0)
  const tiposEvento = new Set<string>()
  data.forEach((file) => {
    file.tiposEvento.forEach((tipo) => tiposEvento.add(tipo))
  })

  const alertStyles = getAlertStyles(securityAlert.severity)

  return (
    <Document>
      {/* Portada */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.title}>Reporte de Eventos Vehiculares</Text>
          <Text style={styles.subtitle}>Análisis de Telemetría y Seguridad</Text>
          <Text style={styles.date}>Generado el {fechaGeneracion}</Text>
        </View>
      </Page>

      {/* Alertas de Seguridad */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ALERTAS DE SEGURIDAD</Text>

          <View style={[styles.alertBanner, alertStyles.banner]}>
            {securityAlert.severity !== "OK" && (
              <Text style={[styles.alertTitle, alertStyles.title]}>
                ALERTA {getSeverityLabel(securityAlert.severity)} DE SEGURIDAD
              </Text>
            )}
            <Text style={[styles.alertMessage, alertStyles.message]}>
              {securityAlert.message}
            </Text>
            {securityAlert.severity !== "OK" && (
              <View style={alertStyles.badge}>
                <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>
                  {getSeverityLabel(securityAlert.severity)}
                </Text>
              </View>
            )}
            {securityAlert.count && (
              <Text style={[styles.text, alertStyles.message, { marginTop: 5 }]}>
                Eventos relacionados: {securityAlert.count}
              </Text>
            )}
          </View>

          <Text style={styles.text}>
            Las alertas de seguridad se generan automáticamente basándose en reglas de prevención
            de riesgos. Se recomienda revisar y tomar acciones preventivas según la severidad indicada.
          </Text>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
      </Page>

      {/* Resumen Ejecutivo */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Ejecutivo</Text>

          <Text style={styles.subsectionTitle}>Indicadores Principales</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total de Eventos</Text>
              <Text style={styles.kpiValue}>{totalEventos.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Tipos de Evento</Text>
              <Text style={styles.kpiValue}>{tiposEvento.size}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Archivos Procesados</Text>
              <Text style={styles.kpiValue}>{data.length}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Estado de Seguridad</Text>
              <Text style={[styles.kpiValue, alertStyles.title]}>
                {getSeverityLabel(securityAlert.severity)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `Página ${pageNumber}`} fixed />
      </Page>
    </Document>
  )
}
