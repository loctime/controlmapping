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

  // Calcular KPIs ejecutivos (mismos que en la UI)
  const allEventos = data.flatMap((file) => file.eventos)
  
  // Eventos críticos (D1 o D3)
  const eventosCriticos = allEventos.filter(
    (e) => e.evento?.trim() === "D1" || e.evento?.trim() === "D3"
  ).length

  // Eventos de fatiga (D1)
  const eventosFatiga = allEventos.filter(
    (e) => e.evento?.trim() === "D1"
  ).length

  // Vehículos únicos
  const vehiculosUnicos = new Set(
    allEventos
      .map((e) => e.vehiculo?.trim())
      .filter((v) => v && v !== "")
  ).size

  // Operadores únicos
  const operadoresUnicos = new Set(
    allEventos
      .map((e) => e.operador?.trim())
      .filter((o) => o && o !== "")
  ).size

  // Velocidad máxima registrada
  const velocidades = allEventos
    .map((e) => e.velocidad)
    .filter((v) => v > 0)
  const velocidadMaxima = velocidades.length > 0 ? Math.max(...velocidades) : 0

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

      {/* Análisis de Eventos */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ANÁLISIS DE EVENTOS</Text>

          <Text style={styles.subsectionTitle}>Resumen Ejecutivo</Text>
          <Text style={styles.text}>
            El análisis de eventos vehiculares muestra un total de {totalEventos.toLocaleString()} eventos
            registrados en {data.length} archivo{data.length !== 1 ? "s" : ""} procesado{data.length !== 1 ? "s" : ""}.
            De estos eventos, {eventosCriticos.toLocaleString()} son considerados críticos (eventos tipo D1 o D3),
            incluyendo {eventosFatiga.toLocaleString()} eventos de fatiga (tipo D1).
          </Text>

          <Text style={styles.text}>
            El análisis abarca {vehiculosUnicos.toLocaleString()} vehículo{vehiculosUnicos !== 1 ? "s" : ""} único{vehiculosUnicos !== 1 ? "s" : ""} y{" "}
            {operadoresUnicos.toLocaleString()} operador{operadoresUnicos !== 1 ? "es" : ""} único{operadoresUnicos !== 1 ? "s" : ""}.
            {velocidadMaxima > 0 && (
              <> La velocidad máxima registrada fue de {velocidadMaxima.toLocaleString()} km/h.</>
            )}
          </Text>

          <Text style={styles.subsectionTitle}>Indicadores Ejecutivos</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Eventos Críticos</Text>
              <Text style={styles.kpiValue}>{eventosCriticos.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>D1 o D3</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Eventos de Fatiga</Text>
              <Text style={styles.kpiValue}>{eventosFatiga.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>Tipo D1</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Vehículos Únicos</Text>
              <Text style={styles.kpiValue}>{vehiculosUnicos.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>Total distintos</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Operadores Únicos</Text>
              <Text style={styles.kpiValue}>{operadoresUnicos.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>Total distintos</Text>
            </View>
            {velocidadMaxima > 0 && (
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Velocidad Máxima</Text>
                <Text style={styles.kpiValue}>{velocidadMaxima.toLocaleString()}</Text>
                <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>km/h</Text>
              </View>
            )}
          </View>

          <Text style={styles.text}>
            Estos indicadores proporcionan una visión general del estado de seguridad vehicular
            y permiten identificar áreas que requieren atención inmediata o seguimiento continuo.
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
