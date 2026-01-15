import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { VehiculoEventosFile, VehiculoEvento } from "@/domains/vehiculo/types"
import type { SecurityAlert } from "./securityAlerts"
import {
  computeOperatorRiskProfiles,
  computeVehicleRiskProfiles,
  countD1D3,
  computeFactors,
} from "./riskModel"

interface VehiculoEventosPdfReportProps {
  data: VehiculoEventosFile[]
  securityAlert: SecurityAlert
  mode?: "executive" | "technical"
}

// Estilos del PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60, // Espacio para el footer
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
  kpiSubtext: {
    fontSize: 9,
    color: "#9ca3af",
    marginTop: 3,
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
  executiveCover: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
    backgroundColor: "#1f2937",
  },
  executiveTitle: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#ffffff",
    textAlign: "center",
  },
  executiveSubtitle: {
    fontSize: 18,
    color: "#d1d5db",
    marginBottom: 30,
    textAlign: "center",
  },
  executiveDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 40,
    textAlign: "center",
  },
  priorityCard: {
    padding: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dc2626",
    borderRadius: 4,
    marginBottom: 10,
  },
  driverBar: {
    height: 8,
    borderRadius: 2,
    marginTop: 4,
    marginBottom: 8,
  },
  recommendationBox: {
    padding: 15,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#0ea5e9",
    borderRadius: 4,
    marginBottom: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 20,
  },
  sectionSpacer: {
    marginBottom: 25,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#6b7280",
    flex: 1,
  },
  footerCenter: {
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
    flex: 1,
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

// Función para generar resumen ejecutivo interpretativo usando nuevo modelo
function generarResumenEjecutivo(
  distribution: ReturnType<typeof countD1D3>,
  factors: ReturnType<typeof computeFactors>,
  vehiculosUnicos: number,
  operadoresUnicos: number,
  allEventos: VehiculoEvento[],
  securityAlert: SecurityAlert
): string {
  const partes: string[] = []

  // Primera parte: Total de eventos y distribución D1/D3
  if (distribution.total > 0) {
    partes.push(
      `Durante el período analizado se registraron ${distribution.total.toLocaleString()} evento${distribution.total !== 1 ? "s" : ""} de seguridad vial`
    )

    if (distribution.d1 > 0 || distribution.d3 > 0) {
      const eventosDesc: string[] = []
      if (distribution.d1 > 0) {
        eventosDesc.push(`${distribution.d1} de fatiga (D1)`)
      }
      if (distribution.d3 > 0) {
        eventosDesc.push(`${distribution.d3} de distracción (D3)`)
      }
      partes.push(`(${eventosDesc.join(" y ")})`)
    }

    if (distribution.pctFatiga >= 50) {
      partes.push(
        `con predominio de eventos de fatiga (${distribution.pctFatiga.toFixed(1)}%)`
      )
    }
  }

  // Segunda parte: Alertas
  if (securityAlert.severity !== "OK") {
    const severidadTexto =
      securityAlert.severity === "CRITICAL"
        ? "crítica"
        : securityAlert.severity === "HIGH"
        ? "alta"
        : "media"

    if (securityAlert.count) {
      partes.push(
        `Se detectó una alerta ${severidadTexto} de seguridad, asociada a ${securityAlert.count} evento${securityAlert.count !== 1 ? "s" : ""}`
      )
    } else {
      partes.push(`Se detectó una alerta ${severidadTexto} de seguridad`)
    }

    // Agregar contexto si hay reincidencia (factor de severidad)
    if (factors.reincidencia > 0) {
      partes.push(`con ${factors.reincidencia} día${factors.reincidencia !== 1 ? "s" : ""} de reincidencia detectado${factors.reincidencia !== 1 ? "s" : ""}`)
    }
  }

  // Tercera parte: Franja horaria (factor de severidad)
  if (factors.franjaDominante) {
    const horaInicio = factors.franjaDominante.split("-")[0]
    const horaFin = factors.franjaDominante.split("-")[1]
    partes.push(
      `La mayor concentración de eventos ocurrió en la franja ${horaInicio}–${horaFin} h (${factors.franjaCount} evento${factors.franjaCount !== 1 ? "s" : ""})`
    )
  }

  // Cuarta parte: Factores de severidad adicionales
  if (factors.altaVelocidad > 0) {
    partes.push(
      `Se registraron ${factors.altaVelocidad} evento${factors.altaVelocidad !== 1 ? "s" : ""} con velocidad mayor o igual a 80 km/h`
    )
  }

  return partes.join(". ") + "."
}

// Componente de Footer reutilizable
const PdfFooter: React.FC = () => {
  const fechaHoraGeneracion = new Date().toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Generado por ControlMapping</Text>
      <Text style={styles.footerCenter}>{fechaHoraGeneracion}</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

export const VehiculoEventosPdfReport: React.FC<VehiculoEventosPdfReportProps> = ({
  data,
  securityAlert,
  mode = "executive",
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

  // Calcular KPIs ejecutivos usando nuevo modelo
  const allEventos = data.flatMap((file) => file.eventos)
  
  // Distribución de eventos reales (D1/D3)
  const distribution = countD1D3(allEventos)
  const factors = computeFactors(allEventos)

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

  // Generar resumen ejecutivo interpretativo usando nuevo modelo
  const resumenEjecutivoTexto = generarResumenEjecutivo(
    distribution,
    factors,
    vehiculosUnicos,
    operadoresUnicos,
    allEventos,
    securityAlert
  )

  // Calcular rankings usando nuevo modelo para modo executive
  const operadoresProfiles = mode === "executive" ? computeOperatorRiskProfiles(allEventos) : []
  const vehiculosProfiles = mode === "executive" ? computeVehicleRiskProfiles(allEventos) : []

  // Top 3 operadores y vehículos críticos
  const top3Operadores = operadoresProfiles
    .filter((op) => op.score.level === "HIGH" && op.score.score > 50)
    .slice(0, 3)
  const top3Vehiculos = vehiculosProfiles
    .filter((veh) => veh.score.level === "HIGH" && veh.score.score > 50)
    .slice(0, 3)

  // Calcular eventos por tipo (solo D1 y D3) y franja horaria para gráficos
  const eventosPorTipo: Record<string, number> = {}
  const eventosPorFranja: Record<string, number> = {
    "00-06": 0,
    "06-12": 0,
    "12-18": 0,
    "18-24": 0,
  }

  allEventos.forEach((evento) => {
    // Por tipo (solo D1 y D3)
    const tipo = evento.evento?.trim()
    if (tipo === "D1" || tipo === "D3") {
      eventosPorTipo[tipo] = (eventosPorTipo[tipo] || 0) + 1
    }

    // Por franja (para visualización, no como evento)
    const hora = evento.fecha.getHours()
    if (hora >= 0 && hora < 6) eventosPorFranja["00-06"]++
    else if (hora >= 6 && hora < 12) eventosPorFranja["06-12"]++
    else if (hora >= 12 && hora < 18) eventosPorFranja["12-18"]++
    else if (hora >= 18 && hora < 24) eventosPorFranja["18-24"]++
  })

  // Generar recomendaciones basadas en los datos reales
  const recomendaciones: string[] = []
  if (distribution.pctFatiga >= 50) {
    recomendaciones.push(`Revisar políticas de turnos y descansos debido a alta incidencia de eventos de fatiga (${distribution.pctFatiga.toFixed(1)}%)`)
  }
  if (top3Operadores.length > 0) {
    recomendaciones.push(`Capacitar a los operadores ${top3Operadores.map((o) => o.operador).join(", ")} en prevención de riesgos`)
  }
  if (top3Vehiculos.length > 0) {
    recomendaciones.push(`Realizar mantenimiento preventivo en vehículos ${top3Vehiculos.map((v) => v.vehiculo).join(", ")}`)
  }
  const franjaMasEventos = Object.entries(eventosPorFranja).reduce((a, b) =>
    eventosPorFranja[a[0]] > eventosPorFranja[b[0]] ? a : b
  )
  if (franjaMasEventos[1] > 0) {
    recomendaciones.push(`Reforzar controles en la franja horaria ${franjaMasEventos[0]}h debido a mayor concentración de eventos`)
  }

  if (mode === "executive") {
    return (
      <Document>
        {/* 1. Portada Ejecutiva */}
        <Page size="A4" style={styles.page}>
          <View style={styles.executiveCover}>
            <Text style={styles.executiveTitle}>REPORTE EJECUTIVO</Text>
            <Text style={styles.executiveSubtitle}>Seguridad Vehicular</Text>
            <Text style={styles.executiveSubtitle}>Análisis de Riesgos y Prioridades</Text>
            <Text style={styles.executiveDate}>Generado el {fechaGeneracion}</Text>
          </View>
          <PdfFooter />
        </Page>

        {/* 2. Resumen Ejecutivo + Alertas de Seguridad */}
        <Page size="A4" style={styles.page}>
          {/* Resumen Ejecutivo */}
          <View wrap={false} style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>RESUMEN EJECUTIVO</Text>
            <Text style={[styles.text, { fontSize: 12, lineHeight: 1.8 }]}>
              {resumenEjecutivoTexto}
            </Text>
          </View>

          {/* Separador visual */}
          <View style={styles.sectionDivider} />

          {/* Alertas de Seguridad */}
          <View wrap={false}>
            <Text style={styles.sectionTitle}>ALERTAS DE SEGURIDAD</Text>
            <View style={[styles.alertBanner, alertStyles.banner, { padding: 15, marginBottom: 10 }]}>
              {securityAlert.severity !== "OK" && (
                <Text style={[styles.alertTitle, alertStyles.title, { fontSize: 14 }]}>
                  ALERTA {getSeverityLabel(securityAlert.severity)} DE SEGURIDAD
                </Text>
              )}
              <Text style={[styles.alertMessage, alertStyles.message, { fontSize: 11, lineHeight: 1.6 }]}>
                {securityAlert.message}
              </Text>
              {securityAlert.severity !== "OK" && (
                <View
                  style={[
                    styles.alertBadge,
                    alertStyles.badge[1] || styles.badgeCritical,
                    { marginTop: 8, padding: 6 },
                  ]}
                >
                  <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>
                    {getSeverityLabel(securityAlert.severity)}
                  </Text>
                </View>
              )}
              {securityAlert.count && (
                <Text style={[styles.text, alertStyles.message, { marginTop: 8, fontSize: 10 }]}>
                  Eventos relacionados: {securityAlert.count}
                </Text>
              )}
            </View>
          </View>

          <PdfFooter />
        </Page>

        {/* 3. Indicadores Clave + Prioridades de Intervención */}
        <Page size="A4" style={styles.page}>
          {/* KPIs Ejecutivos */}
          <View wrap={false} style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>INDICADORES CLAVE</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total de Eventos</Text>
                <Text style={styles.kpiValue}>{distribution.total.toLocaleString()}</Text>
                <Text style={styles.kpiSubtext}>D1 + D3</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Fatiga (D1)</Text>
                <Text style={styles.kpiValue}>{distribution.d1.toLocaleString()}</Text>
                <Text style={styles.kpiSubtext}>{distribution.pctFatiga.toFixed(1)}%</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Distracción (D3)</Text>
                <Text style={styles.kpiValue}>{distribution.d3.toLocaleString()}</Text>
                <Text style={styles.kpiSubtext}>{distribution.pctDistraccion.toFixed(1)}%</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Vehículos Únicos</Text>
                <Text style={styles.kpiValue}>{vehiculosUnicos.toLocaleString()}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Operadores Únicos</Text>
                <Text style={styles.kpiValue}>{operadoresUnicos.toLocaleString()}</Text>
              </View>
              {velocidadMaxima > 0 && (
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Velocidad Máxima</Text>
                  <Text style={styles.kpiValue}>{velocidadMaxima.toLocaleString()} km/h</Text>
                </View>
              )}
            </View>
          </View>

          {/* Separador visual */}
          {(top3Operadores.length > 0 || top3Vehiculos.length > 0) && (
            <>
              <View style={styles.sectionDivider} />

              {/* Prioridades de Intervención */}
              <View wrap={false}>
                <Text style={styles.sectionTitle}>PRIORIDADES DE INTERVENCIÓN</Text>
                
                {top3Operadores.length > 0 && (
                  <>
                    <Text style={styles.subsectionTitle}>Operadores Críticos</Text>
                    {top3Operadores.map((op, idx) => (
                      <View key={op.operador} style={styles.priorityCard}>
                        <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>
                          #{idx + 1} - {op.operador}
                        </Text>
                        <Text style={{ fontSize: 9, color: "#374151" }}>
                          Score: {op.score.score.toFixed(1)} ({op.score.level}) • Eventos: {op.totalEventos} • Fatiga (D1): {op.distribution.d1} • Distracción (D3): {op.distribution.d3}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {top3Vehiculos.length > 0 && (
                  <>
                    <Text style={[styles.subsectionTitle, { marginTop: 12 }]}>Vehículos Críticos</Text>
                    {top3Vehiculos.map((veh, idx) => (
                      <View key={veh.vehiculo} style={styles.priorityCard}>
                        <Text style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>
                          #{idx + 1} - {veh.vehiculo}
                        </Text>
                        <Text style={{ fontSize: 9, color: "#374151" }}>
                          Score: {veh.score.score.toFixed(1)} ({veh.score.level}) • Eventos: {veh.totalEventos} • Fatiga (D1): {veh.distribution.d1} • Distracción (D3): {veh.distribution.d3}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </>
          )}

          <PdfFooter />
        </Page>

        {/* 4. Factores de Riesgo + Rankings (si entran completos) */}
        {(top3Operadores.length > 0 || top3Vehiculos.length > 0) && (
          <Page size="A4" style={styles.page}>
            {/* Factores de Riesgo */}
            <View wrap={false} style={styles.sectionSpacer}>
              <Text style={styles.sectionTitle}>FACTORES DE RIESGO DOMINANTES</Text>
              
              {top3Operadores.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>Operadores</Text>
                  {top3Operadores.map((op) => (
                    <View key={op.operador} style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
                        {op.operador}
                      </Text>
                      {/* Distribución de eventos (D1/D3) */}
                      <View style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: 8, color: "#6b7280", marginBottom: 2 }}>
                          Distribución de eventos:
                        </Text>
                        {op.distribution.d1 > 0 && (
                          <View style={{ marginBottom: 2 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                              <Text style={{ fontSize: 8, color: "#6b7280" }}>Fatiga (D1):</Text>
                              <Text style={{ fontSize: 8, fontWeight: "bold", color: "#dc2626" }}>
                                {op.distribution.d1} ({op.distribution.pctFatiga.toFixed(1)}%)
                              </Text>
                            </View>
                            <View style={[styles.driverBar, { backgroundColor: "#fee2e2", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#dc2626", width: `${op.distribution.pctFatiga}%` }} />
                            </View>
                          </View>
                        )}
                        {op.distribution.d3 > 0 && (
                          <View style={{ marginBottom: 2 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                              <Text style={{ fontSize: 8, color: "#6b7280" }}>Distracción (D3):</Text>
                              <Text style={{ fontSize: 8, fontWeight: "bold", color: "#ea580c" }}>
                                {op.distribution.d3} ({op.distribution.pctDistraccion.toFixed(1)}%)
                              </Text>
                            </View>
                            <View style={[styles.driverBar, { backgroundColor: "#ffedd5", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#ea580c", width: `${op.distribution.pctDistraccion}%` }} />
                            </View>
                          </View>
                        )}
                      </View>
                      {/* Factores de severidad */}
                      {(op.factors.altaVelocidad > 0 || op.factors.reincidencia > 0 || op.factors.franjaDominante) && (
                        <View style={{ marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
                          <Text style={{ fontSize: 8, color: "#6b7280", marginBottom: 2 }}>
                            Factores de riesgo:
                          </Text>
                          {op.factors.altaVelocidad > 0 && (
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              • Alta velocidad: {op.factors.altaVelocidad} evento{op.factors.altaVelocidad !== 1 ? "s" : ""}
                            </Text>
                          )}
                          {op.factors.reincidencia > 0 && (
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              • Reincidencia: {op.factors.reincidencia} día{op.factors.reincidencia !== 1 ? "s" : ""} crítico{op.factors.reincidencia !== 1 ? "s" : ""}
                            </Text>
                          )}
                          {op.factors.franjaDominante && (
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              • Franja dominante: {op.factors.franjaDominante}h ({op.factors.franjaCount} evento{op.factors.franjaCount !== 1 ? "s" : ""})
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}

              {top3Vehiculos.length > 0 && (
                <>
                  <Text style={[styles.subsectionTitle, { marginTop: 12 }]}>Vehículos</Text>
                  {top3Vehiculos.map((veh) => (
                    <View key={veh.vehiculo} style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
                        {veh.vehiculo}
                      </Text>
                      {/* Distribución de eventos (D1/D3) */}
                      <View style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: 8, color: "#6b7280", marginBottom: 2 }}>
                          Distribución de eventos:
                        </Text>
                        {veh.distribution.d1 > 0 && (
                          <View style={{ marginBottom: 2 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                              <Text style={{ fontSize: 8, color: "#6b7280" }}>Fatiga (D1):</Text>
                              <Text style={{ fontSize: 8, fontWeight: "bold", color: "#dc2626" }}>
                                {veh.distribution.d1} ({veh.distribution.pctFatiga.toFixed(1)}%)
                              </Text>
                            </View>
                            <View style={[styles.driverBar, { backgroundColor: "#fee2e2", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#dc2626", width: `${veh.distribution.pctFatiga}%` }} />
                            </View>
                          </View>
                        )}
                        {veh.distribution.d3 > 0 && (
                          <View style={{ marginBottom: 2 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                              <Text style={{ fontSize: 8, color: "#6b7280" }}>Distracción (D3):</Text>
                              <Text style={{ fontSize: 8, fontWeight: "bold", color: "#ea580c" }}>
                                {veh.distribution.d3} ({veh.distribution.pctDistraccion.toFixed(1)}%)
                              </Text>
                            </View>
                            <View style={[styles.driverBar, { backgroundColor: "#ffedd5", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#ea580c", width: `${veh.distribution.pctDistraccion}%` }} />
                            </View>
                          </View>
                        )}
                      </View>
                      {/* Factores de severidad */}
                      {(veh.factors.altaVelocidad > 0 || veh.factors.reincidencia > 0 || veh.factors.franjaDominante) && (
                        <View style={{ marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
                          <Text style={{ fontSize: 8, color: "#6b7280", marginBottom: 2 }}>
                            Factores de riesgo:
                          </Text>
                          {veh.factors.altaVelocidad > 0 && (
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              • Alta velocidad: {veh.factors.altaVelocidad} evento{veh.factors.altaVelocidad !== 1 ? "s" : ""}
                            </Text>
                          )}
                          {veh.factors.reincidencia > 0 && (
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              • Reincidencia: {veh.factors.reincidencia} día{veh.factors.reincidencia !== 1 ? "s" : ""} crítico{veh.factors.reincidencia !== 1 ? "s" : ""}
                            </Text>
                          )}
                          {veh.factors.franjaDominante && (
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              • Franja dominante: {veh.factors.franjaDominante}h ({veh.factors.franjaCount} evento{veh.factors.franjaCount !== 1 ? "s" : ""})
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* Separador visual - solo si hay rankings para mostrar */}
            {(operadoresProfiles.length > 0 || vehiculosProfiles.length > 0) && (
              <>
                <View style={styles.sectionDivider} />

                {/* Rankings Resumidos */}
                <View wrap={false}>
                  <Text style={styles.sectionTitle}>RANKINGS DE RIESGO</Text>
                  
                  {operadoresProfiles.length > 0 && (
                    <>
                      <Text style={styles.subsectionTitle}>Top 10 Operadores por Score de Riesgo</Text>
                      <View style={{ marginBottom: 15 }}>
                        {operadoresProfiles.slice(0, 10).map((op, idx) => (
                          <View
                            key={op.operador}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              paddingVertical: 5,
                              paddingHorizontal: 8,
                              backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                              borderLeftWidth: op.score.level === "HIGH" ? 3 : op.score.level === "MEDIUM" ? 2 : 1,
                              borderLeftColor:
                                op.score.level === "HIGH" ? "#dc2626" : op.score.level === "MEDIUM" ? "#eab308" : "#22c55e",
                              marginBottom: 2,
                            }}
                          >
                            <View style={{ flexDirection: "row", flex: 1 }}>
                              <Text style={{ fontSize: 9, color: "#6b7280", width: 25 }}>
                                #{idx + 1}
                              </Text>
                              <Text style={{ fontSize: 9, fontWeight: op.score.level === "HIGH" ? "bold" : "normal", flex: 1 }}>
                                {op.operador}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <Text style={{ fontSize: 9, color: "#6b7280", width: 40 }}>
                                Score: {op.score.score.toFixed(1)}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 9,
                                  color:
                                    op.score.level === "HIGH" ? "#dc2626" : op.score.level === "MEDIUM" ? "#eab308" : "#22c55e",
                                  fontWeight: "bold",
                                  width: 50,
                                }}
                              >
                                {op.score.level}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {vehiculosProfiles.length > 0 && (
                    <>
                      <Text style={[styles.subsectionTitle, { marginTop: 10 }]}>Top 10 Vehículos por Score de Riesgo</Text>
                      <View>
                        {vehiculosProfiles.slice(0, 10).map((veh, idx) => (
                          <View
                            key={veh.vehiculo}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              paddingVertical: 5,
                              paddingHorizontal: 8,
                              backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                              borderLeftWidth: veh.score.level === "HIGH" ? 3 : veh.score.level === "MEDIUM" ? 2 : 1,
                              borderLeftColor:
                                veh.score.level === "HIGH" ? "#dc2626" : veh.score.level === "MEDIUM" ? "#eab308" : "#22c55e",
                              marginBottom: 2,
                            }}
                          >
                            <View style={{ flexDirection: "row", flex: 1 }}>
                              <Text style={{ fontSize: 9, color: "#6b7280", width: 25 }}>
                                #{idx + 1}
                              </Text>
                              <Text style={{ fontSize: 9, fontWeight: veh.score.level === "HIGH" ? "bold" : "normal", flex: 1 }}>
                                {veh.vehiculo}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <Text style={{ fontSize: 9, color: "#6b7280", width: 40 }}>
                                Score: {veh.score.score.toFixed(1)}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 9,
                                  color:
                                    veh.score.level === "HIGH" ? "#dc2626" : veh.score.level === "MEDIUM" ? "#eab308" : "#22c55e",
                                  fontWeight: "bold",
                                  width: 50,
                                }}
                              >
                                {veh.score.level}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              </>
            )}

            <PdfFooter />
          </Page>
        )}

        {/* 5. Rankings Resumidos (página propia si no entraron en la anterior) */}
        {((top3Operadores.length === 0 && top3Vehiculos.length === 0) && (operadoresProfiles.length > 0 || vehiculosProfiles.length > 0)) && (
          <Page size="A4" style={styles.page}>
            <View wrap={false} style={styles.section}>
              <Text style={styles.sectionTitle}>RANKINGS DE RIESGO</Text>
              
              {operadoresProfiles.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>Top 10 Operadores por Score de Riesgo</Text>
                  <View style={{ marginBottom: 15 }}>
                    {operadoresProfiles.slice(0, 10).map((op, idx) => (
                      <View
                        key={op.operador}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 5,
                          paddingHorizontal: 8,
                          backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                          borderLeftWidth: op.score.level === "HIGH" ? 3 : op.score.level === "MEDIUM" ? 2 : 1,
                          borderLeftColor:
                            op.score.level === "HIGH" ? "#dc2626" : op.score.level === "MEDIUM" ? "#eab308" : "#22c55e",
                          marginBottom: 2,
                        }}
                      >
                        <View style={{ flexDirection: "row", flex: 1 }}>
                          <Text style={{ fontSize: 9, color: "#6b7280", width: 25 }}>
                            #{idx + 1}
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: op.score.level === "HIGH" ? "bold" : "normal", flex: 1 }}>
                            {op.operador}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Text style={{ fontSize: 9, color: "#6b7280", width: 40 }}>
                            Score: {op.score.score.toFixed(1)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              color:
                                op.score.level === "HIGH" ? "#dc2626" : op.score.level === "MEDIUM" ? "#eab308" : "#22c55e",
                              fontWeight: "bold",
                              width: 50,
                            }}
                          >
                            {op.score.level}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {vehiculosProfiles.length > 0 && (
                <>
                  <Text style={[styles.subsectionTitle, { marginTop: 10 }]}>Top 10 Vehículos por Score de Riesgo</Text>
                  <View>
                    {vehiculosProfiles.slice(0, 10).map((veh, idx) => (
                      <View
                        key={veh.vehiculo}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 5,
                          paddingHorizontal: 8,
                          backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                          borderLeftWidth: veh.score.level === "HIGH" ? 3 : veh.score.level === "MEDIUM" ? 2 : 1,
                          borderLeftColor:
                            veh.score.level === "HIGH" ? "#dc2626" : veh.score.level === "MEDIUM" ? "#eab308" : "#22c55e",
                          marginBottom: 2,
                        }}
                      >
                        <View style={{ flexDirection: "row", flex: 1 }}>
                          <Text style={{ fontSize: 9, color: "#6b7280", width: 25 }}>
                            #{idx + 1}
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: veh.score.level === "HIGH" ? "bold" : "normal", flex: 1 }}>
                            {veh.vehiculo}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Text style={{ fontSize: 9, color: "#6b7280", width: 40 }}>
                            Score: {veh.score.score.toFixed(1)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              color:
                                veh.score.level === "HIGH" ? "#dc2626" : veh.score.level === "MEDIUM" ? "#eab308" : "#22c55e",
                              fontWeight: "bold",
                              width: 50,
                            }}
                          >
                            {veh.score.level}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
            <PdfFooter />
          </Page>
        )}

        {/* 6. Análisis de Contexto + Recomendaciones (agrupadas) */}
        <Page size="A4" style={styles.page}>
          {/* Gráficos de Contexto */}
          <View wrap={false} style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>ANÁLISIS DE CONTEXTO</Text>
            
            <Text style={styles.subsectionTitle}>Distribución por Tipo de Evento</Text>
            {distribution.d1 > 0 && (
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 10 }}>Fatiga (D1)</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold" }}>{distribution.d1}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: "#e5e7eb", borderRadius: 2 }}>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: "#dc2626",
                      width: `${distribution.total > 0 ? (distribution.d1 / distribution.total) * 100 : 0}%`,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            )}
            {distribution.d3 > 0 && (
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 10 }}>Distracción (D3)</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold" }}>{distribution.d3}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: "#e5e7eb", borderRadius: 2 }}>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: "#ea580c",
                      width: `${distribution.total > 0 ? (distribution.d3 / distribution.total) * 100 : 0}%`,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            )}

            <Text style={[styles.subsectionTitle, { marginTop: 15 }]}>Distribución por Franja Horaria</Text>
            <Text style={{ fontSize: 9, color: "#6b7280", marginBottom: 8, fontStyle: "italic" }}>
              (Factor de severidad - no es un tipo de evento)
            </Text>
            {Object.entries(eventosPorFranja).map(([franja, cantidad]) => (
              <View key={franja} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 10 }}>{franja}h</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold" }}>{cantidad}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: "#e5e7eb", borderRadius: 2 }}>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: franja === factors.franjaDominante ? "#dc2626" : "#3b82f6",
                      width: `${distribution.total > 0 ? (cantidad / distribution.total) * 100 : 0}%`,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Separador visual - solo si hay recomendaciones */}
          {recomendaciones.length > 0 && (
            <>
              <View style={styles.sectionDivider} />

              {/* Recomendaciones Finales */}
              <View wrap={false}>
                <Text style={styles.sectionTitle}>RECOMENDACIONES</Text>
                {recomendaciones.map((rec, idx) => (
                  <View key={idx} style={styles.recommendationBox}>
                    <Text style={{ fontSize: 11, lineHeight: 1.6 }}>
                      {idx + 1}. {rec}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <PdfFooter />
        </Page>
      </Document>
    )
  }

  // Modo técnico (original)
  return (
    <Document>
      {/* Portada */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.title}>Reporte de Eventos Vehiculares</Text>
          <Text style={styles.subtitle}>Análisis de Telemetría y Seguridad</Text>
          <Text style={styles.date}>Generado el {fechaGeneracion}</Text>
        </View>
        <PdfFooter />
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

        <PdfFooter />
      </Page>

      {/* Resumen Ejecutivo del Período */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESUMEN EJECUTIVO DEL PERÍODO</Text>

          <Text style={styles.subsectionTitle}>Análisis Interpretativo</Text>
          <Text style={[styles.text, { marginBottom: 20, lineHeight: 1.8 }]}>
            {resumenEjecutivoTexto}
          </Text>

          <Text style={styles.subsectionTitle}>Indicadores Clave</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total de Eventos</Text>
              <Text style={styles.kpiValue}>{distribution.total.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>D1 + D3</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Fatiga (D1)</Text>
              <Text style={styles.kpiValue}>{distribution.d1.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>{distribution.pctFatiga.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Distracción (D3)</Text>
              <Text style={styles.kpiValue}>{distribution.d3.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>{distribution.pctDistraccion.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Vehículos Únicos</Text>
              <Text style={styles.kpiValue}>{vehiculosUnicos.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Operadores Únicos</Text>
              <Text style={styles.kpiValue}>{operadoresUnicos.toLocaleString()}</Text>
            </View>
          </View>
          
          {/* Factores de Riesgo */}
          {(factors.altaVelocidad > 0 || factors.reincidencia > 0 || factors.franjaDominante) && (
            <View style={{ marginTop: 15, padding: 12, backgroundColor: "#fffbeb", borderRadius: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: "#78350f", marginBottom: 6 }}>
                Factores de Riesgo Detectados:
              </Text>
              <View style={{ gap: 4 }}>
                {factors.altaVelocidad > 0 && (
                  <Text style={{ fontSize: 9, color: "#78350f" }}>
                    • Alta velocidad: {factors.altaVelocidad} evento{factors.altaVelocidad !== 1 ? "s" : ""} con velocidad {">="} 80 km/h
                  </Text>
                )}
                {factors.reincidencia > 0 && (
                  <Text style={{ fontSize: 9, color: "#78350f" }}>
                    • Reincidencia: {factors.reincidencia} día{factors.reincidencia !== 1 ? "s" : ""} con {">="} 3 eventos
                  </Text>
                )}
                {factors.franjaDominante && (
                  <Text style={{ fontSize: 9, color: "#78350f" }}>
                    • Franja dominante: {factors.franjaDominante}h ({factors.franjaCount} evento{factors.franjaCount !== 1 ? "s" : ""})
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        <PdfFooter />
      </Page>

      {/* Análisis de Eventos */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ANÁLISIS DE EVENTOS</Text>

          <Text style={styles.subsectionTitle}>Resumen Ejecutivo</Text>
          <Text style={styles.text}>
            El análisis de eventos vehiculares muestra un total de {distribution.total.toLocaleString()} eventos
            registrados en {data.length} archivo{data.length !== 1 ? "s" : ""} procesado{data.length !== 1 ? "s" : ""}.
            Los eventos registrados incluyen {distribution.d1.toLocaleString()} eventos de fatiga (D1) y {distribution.d3.toLocaleString()} eventos de distracción (D3).
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
              <Text style={styles.kpiLabel}>Fatiga (D1)</Text>
              <Text style={styles.kpiValue}>{distribution.d1.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>{distribution.pctFatiga.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Distracción (D3)</Text>
              <Text style={styles.kpiValue}>{distribution.d3.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>{distribution.pctDistraccion.toFixed(1)}%</Text>
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

        <PdfFooter />
      </Page>

      {/* Resumen Ejecutivo */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Ejecutivo</Text>

          <Text style={styles.subsectionTitle}>Indicadores Principales</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total de Eventos</Text>
              <Text style={styles.kpiValue}>{distribution.total.toLocaleString()}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>D1 + D3</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Tipos de Evento</Text>
              <Text style={styles.kpiValue}>{distribution.d1 > 0 && distribution.d3 > 0 ? 2 : distribution.total > 0 ? 1 : 0}</Text>
              <Text style={[styles.kpiLabel, { fontSize: 9, marginTop: 3 }]}>D1, D3</Text>
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

        <PdfFooter />
      </Page>
    </Document>
  )
}
