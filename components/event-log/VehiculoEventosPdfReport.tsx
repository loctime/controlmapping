import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { VehiculoEventosFile, VehiculoEvento } from "@/domains/vehiculo/types"
import type { SecurityAlert } from "./securityAlerts"
import {
  calculateRiskScoreByOperator,
  calculateRiskScoreByVehicle,
  calculateRiskDriversByOperator,
  calculateRiskDriversByVehicle,
} from "./riskScoring"

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

// Función para generar resumen ejecutivo interpretativo
function generarResumenEjecutivo(
  totalEventos: number,
  eventosFatiga: number,
  eventosCriticos: number,
  vehiculosUnicos: number,
  operadoresUnicos: number,
  allEventos: VehiculoEvento[],
  securityAlert: SecurityAlert
): string {
  const partes: string[] = []

  // Calcular porcentaje de eventos de fatiga
  const porcentajeFatiga =
    totalEventos > 0 ? Math.round((eventosFatiga / totalEventos) * 100) : 0

  // Calcular franja horaria con más eventos
  const franjas = [
    { nombre: "00-06", inicio: 0, fin: 6 },
    { nombre: "06-12", inicio: 6, fin: 12 },
    { nombre: "12-18", inicio: 12, fin: 18 },
    { nombre: "18-24", inicio: 18, fin: 24 },
  ]

  const conteoFranjas: Record<string, number> = {
    "00-06": 0,
    "06-12": 0,
    "12-18": 0,
    "18-24": 0,
  }

  allEventos.forEach((evento) => {
    const hora = evento.fecha.getHours()
    for (const franja of franjas) {
      if (hora >= franja.inicio && hora < franja.fin) {
        conteoFranjas[franja.nombre]++
        break
      }
    }
  })

  const franjaMasEventos = Object.entries(conteoFranjas).reduce((a, b) =>
    conteoFranjas[a[0]] > conteoFranjas[b[0]] ? a : b
  )

  // Primera parte: Total de eventos y predominio
  if (totalEventos > 0) {
    partes.push(
      `Durante el período analizado se registraron ${totalEventos.toLocaleString()} evento${totalEventos !== 1 ? "s" : ""}`
    )

    if (eventosFatiga > 0 && porcentajeFatiga >= 50) {
      partes.push(
        `con predominio de eventos de fatiga (${porcentajeFatiga}%)`
      )
    } else if (eventosCriticos > 0) {
      const porcentajeCriticos = Math.round(
        (eventosCriticos / totalEventos) * 100
      )
      partes.push(
        `con ${porcentajeCriticos}% de eventos críticos de seguridad`
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

    // Agregar contexto si hay reincidencia
    if (operadoresUnicos < eventosCriticos / 2) {
      partes.push("con reincidencia de eventos en operadores específicos")
    }
  }

  // Tercera parte: Franja horaria
  if (franjaMasEventos[1] > 0) {
    const horaInicio = franjaMasEventos[0].split("-")[0]
    const horaFin = franjaMasEventos[0].split("-")[1]
    partes.push(
      `La mayor concentración de eventos ocurrió en la franja ${horaInicio}–${horaFin} h, lo que sugiere revisar turnos y descansos`
    )
  }

  // Cuarta parte: Contexto adicional si aplica
  if (vehiculosUnicos > 0 && operadoresUnicos > 0) {
    const ratioEventosPorOperador = totalEventos / operadoresUnicos
    if (ratioEventosPorOperador > 5) {
      partes.push(
        `Se observa una alta concentración de eventos por operador, recomendando capacitación adicional`
      )
    }
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

  // Generar resumen ejecutivo interpretativo
  const resumenEjecutivoTexto = generarResumenEjecutivo(
    totalEventos,
    eventosFatiga,
    eventosCriticos,
    vehiculosUnicos,
    operadoresUnicos,
    allEventos,
    securityAlert
  )

  // Calcular rankings y drivers para modo executive
  const operadoresScores = mode === "executive" ? calculateRiskScoreByOperator(allEventos) : []
  const vehiculosScores = mode === "executive" ? calculateRiskScoreByVehicle(allEventos) : []
  const operadoresDrivers = mode === "executive" ? calculateRiskDriversByOperator(allEventos) : []
  const vehiculosDrivers = mode === "executive" ? calculateRiskDriversByVehicle(allEventos) : []

  // Top 3 operadores y vehículos críticos
  const top3Operadores = operadoresScores
    .filter((op) => op.level === "HIGH" && op.score > 50)
    .slice(0, 3)
  const top3Vehiculos = vehiculosScores
    .filter((veh) => veh.level === "HIGH" && veh.score > 50)
    .slice(0, 3)

  // Calcular eventos por tipo y franja horaria para gráficos
  const eventosPorTipo: Record<string, number> = {}
  const eventosPorFranja: Record<string, number> = {
    "00-06": 0,
    "06-12": 0,
    "12-18": 0,
    "18-24": 0,
  }

  allEventos.forEach((evento) => {
    // Por tipo
    const tipo = evento.evento?.trim() || "Desconocido"
    eventosPorTipo[tipo] = (eventosPorTipo[tipo] || 0) + 1

    // Por franja
    const hora = evento.fecha.getHours()
    if (hora >= 0 && hora < 6) eventosPorFranja["00-06"]++
    else if (hora >= 6 && hora < 12) eventosPorFranja["06-12"]++
    else if (hora >= 12 && hora < 18) eventosPorFranja["12-18"]++
    else if (hora >= 18 && hora < 24) eventosPorFranja["18-24"]++
  })

  // Generar recomendaciones basadas en los datos
  const recomendaciones: string[] = []
  if (eventosFatiga > totalEventos * 0.5) {
    recomendaciones.push("Revisar políticas de turnos y descansos debido a alta incidencia de eventos de fatiga")
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
                <Text style={styles.kpiValue}>{totalEventos.toLocaleString()}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Eventos Críticos</Text>
                <Text style={styles.kpiValue}>{eventosCriticos.toLocaleString()}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Eventos de Fatiga</Text>
                <Text style={styles.kpiValue}>{eventosFatiga.toLocaleString()}</Text>
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
                          Score: {op.score.toFixed(1)} • Eventos: {op.totalEventos} • Fatiga: {op.eventosFatiga}
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
                          Score: {veh.score.toFixed(1)} • Eventos: {veh.totalEventos} • Críticos: {veh.eventosCriticos}
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
                  {top3Operadores.map((op) => {
                    const drivers = operadoresDrivers.find((d) => d.operador === op.operador)
                    if (!drivers) return null
                    return (
                      <View key={op.operador} style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
                          {op.operador}
                        </Text>
                        {drivers.drivers.fatigaPct > 0 && (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              Fatiga: {drivers.drivers.fatigaPct.toFixed(1)}%
                            </Text>
                            <View style={[styles.driverBar, { backgroundColor: "#fee2e2", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#dc2626", width: `${drivers.drivers.fatigaPct}%` }} />
                            </View>
                          </View>
                        )}
                        {drivers.drivers.velocidadPct > 0 && (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              Velocidad: {drivers.drivers.velocidadPct.toFixed(1)}%
                            </Text>
                            <View style={[styles.driverBar, { backgroundColor: "#ffedd5", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#ea580c", width: `${drivers.drivers.velocidadPct}%` }} />
                            </View>
                          </View>
                        )}
                        {drivers.drivers.reincidenciaPct > 0 && (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              Reincidencia: {drivers.drivers.reincidenciaPct.toFixed(1)}%
                            </Text>
                            <View style={[styles.driverBar, { backgroundColor: "#fef9c3", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#eab308", width: `${drivers.drivers.reincidenciaPct}%` }} />
                            </View>
                          </View>
                        )}
                      </View>
                    )
                  })}
                </>
              )}

              {top3Vehiculos.length > 0 && (
                <>
                  <Text style={[styles.subsectionTitle, { marginTop: 12 }]}>Vehículos</Text>
                  {top3Vehiculos.map((veh) => {
                    const drivers = vehiculosDrivers.find((d) => d.vehiculo === veh.vehiculo)
                    if (!drivers) return null
                    return (
                      <View key={veh.vehiculo} style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
                          {veh.vehiculo}
                        </Text>
                        {drivers.drivers.fatigaPct > 0 && (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              Fatiga: {drivers.drivers.fatigaPct.toFixed(1)}%
                            </Text>
                            <View style={[styles.driverBar, { backgroundColor: "#fee2e2", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#dc2626", width: `${drivers.drivers.fatigaPct}%` }} />
                            </View>
                          </View>
                        )}
                        {drivers.drivers.velocidadPct > 0 && (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              Velocidad: {drivers.drivers.velocidadPct.toFixed(1)}%
                            </Text>
                            <View style={[styles.driverBar, { backgroundColor: "#ffedd5", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#ea580c", width: `${drivers.drivers.velocidadPct}%` }} />
                            </View>
                          </View>
                        )}
                        {drivers.drivers.reincidenciaPct > 0 && (
                          <View style={{ marginBottom: 4 }}>
                            <Text style={{ fontSize: 8, color: "#6b7280" }}>
                              Reincidencia: {drivers.drivers.reincidenciaPct.toFixed(1)}%
                            </Text>
                            <View style={[styles.driverBar, { backgroundColor: "#fef9c3", width: "100%" }]}>
                              <View style={{ height: 6, backgroundColor: "#eab308", width: `${drivers.drivers.reincidenciaPct}%` }} />
                            </View>
                          </View>
                        )}
                      </View>
                    )
                  })}
                </>
              )}
            </View>

            {/* Separador visual - solo si hay rankings para mostrar */}
            {(operadoresScores.length > 0 || vehiculosScores.length > 0) && (
              <>
                <View style={styles.sectionDivider} />

                {/* Rankings Resumidos */}
                <View wrap={false}>
                  <Text style={styles.sectionTitle}>RANKINGS DE RIESGO</Text>
                  
                  {operadoresScores.length > 0 && (
                    <>
                      <Text style={styles.subsectionTitle}>Top 10 Operadores por Score de Riesgo</Text>
                      <View style={{ marginBottom: 15 }}>
                        {operadoresScores.slice(0, 10).map((op, idx) => (
                          <View
                            key={op.operador}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              paddingVertical: 5,
                              paddingHorizontal: 8,
                              backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                              borderLeftWidth: op.level === "HIGH" ? 3 : op.level === "MEDIUM" ? 2 : 1,
                              borderLeftColor:
                                op.level === "HIGH" ? "#dc2626" : op.level === "MEDIUM" ? "#eab308" : "#22c55e",
                              marginBottom: 2,
                            }}
                          >
                            <View style={{ flexDirection: "row", flex: 1 }}>
                              <Text style={{ fontSize: 9, color: "#6b7280", width: 25 }}>
                                #{idx + 1}
                              </Text>
                              <Text style={{ fontSize: 9, fontWeight: op.level === "HIGH" ? "bold" : "normal", flex: 1 }}>
                                {op.operador}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <Text style={{ fontSize: 9, color: "#6b7280", width: 40 }}>
                                Score: {op.score.toFixed(1)}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 9,
                                  color:
                                    op.level === "HIGH" ? "#dc2626" : op.level === "MEDIUM" ? "#eab308" : "#22c55e",
                                  fontWeight: "bold",
                                  width: 50,
                                }}
                              >
                                {op.level}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {vehiculosScores.length > 0 && (
                    <>
                      <Text style={[styles.subsectionTitle, { marginTop: 10 }]}>Top 10 Vehículos por Score de Riesgo</Text>
                      <View>
                        {vehiculosScores.slice(0, 10).map((veh, idx) => (
                          <View
                            key={veh.vehiculo}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              paddingVertical: 5,
                              paddingHorizontal: 8,
                              backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                              borderLeftWidth: veh.level === "HIGH" ? 3 : veh.level === "MEDIUM" ? 2 : 1,
                              borderLeftColor:
                                veh.level === "HIGH" ? "#dc2626" : veh.level === "MEDIUM" ? "#eab308" : "#22c55e",
                              marginBottom: 2,
                            }}
                          >
                            <View style={{ flexDirection: "row", flex: 1 }}>
                              <Text style={{ fontSize: 9, color: "#6b7280", width: 25 }}>
                                #{idx + 1}
                              </Text>
                              <Text style={{ fontSize: 9, fontWeight: veh.level === "HIGH" ? "bold" : "normal", flex: 1 }}>
                                {veh.vehiculo}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <Text style={{ fontSize: 9, color: "#6b7280", width: 40 }}>
                                Score: {veh.score.toFixed(1)}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 9,
                                  color:
                                    veh.level === "HIGH" ? "#dc2626" : veh.level === "MEDIUM" ? "#eab308" : "#22c55e",
                                  fontWeight: "bold",
                                  width: 50,
                                }}
                              >
                                {veh.level}
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
        {((top3Operadores.length === 0 && top3Vehiculos.length === 0) && (operadoresScores.length > 0 || vehiculosScores.length > 0)) && (
          <Page size="A4" style={styles.page}>
            <View wrap={false} style={styles.section}>
              <Text style={styles.sectionTitle}>RANKINGS DE RIESGO</Text>
              
              {operadoresScores.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>Top 10 Operadores por Score de Riesgo</Text>
                  <View style={{ marginBottom: 15 }}>
                    {operadoresScores.slice(0, 10).map((op, idx) => (
                      <View
                        key={op.operador}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 5,
                          paddingHorizontal: 8,
                          backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                          borderLeftWidth: op.level === "HIGH" ? 3 : op.level === "MEDIUM" ? 2 : 1,
                          borderLeftColor:
                            op.level === "HIGH" ? "#dc2626" : op.level === "MEDIUM" ? "#eab308" : "#22c55e",
                          marginBottom: 2,
                        }}
                      >
                        <View style={{ flexDirection: "row", flex: 1 }}>
                          <Text style={{ fontSize: 9, color: "#6b7280", width: 25 }}>
                            #{idx + 1}
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: op.level === "HIGH" ? "bold" : "normal", flex: 1 }}>
                            {op.operador}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Text style={{ fontSize: 9, color: "#6b7280", width: 40 }}>
                            Score: {op.score.toFixed(1)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              color:
                                op.level === "HIGH" ? "#dc2626" : op.level === "MEDIUM" ? "#eab308" : "#22c55e",
                              fontWeight: "bold",
                              width: 50,
                            }}
                          >
                            {op.level}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {vehiculosScores.length > 0 && (
                <>
                  <Text style={[styles.subsectionTitle, { marginTop: 10 }]}>Top 10 Vehículos por Score de Riesgo</Text>
                  <View>
                    {vehiculosScores.slice(0, 10).map((veh, idx) => (
                      <View
                        key={veh.vehiculo}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 5,
                          paddingHorizontal: 8,
                          backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#ffffff",
                          borderLeftWidth: veh.level === "HIGH" ? 3 : veh.level === "MEDIUM" ? 2 : 1,
                          borderLeftColor:
                            veh.level === "HIGH" ? "#dc2626" : veh.level === "MEDIUM" ? "#eab308" : "#22c55e",
                          marginBottom: 2,
                        }}
                      >
                        <View style={{ flexDirection: "row", flex: 1 }}>
                          <Text style={{ fontSize: 9, color: "#6b7280", width: 25 }}>
                            #{idx + 1}
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: veh.level === "HIGH" ? "bold" : "normal", flex: 1 }}>
                            {veh.vehiculo}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Text style={{ fontSize: 9, color: "#6b7280", width: 40 }}>
                            Score: {veh.score.toFixed(1)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              color:
                                veh.level === "HIGH" ? "#dc2626" : veh.level === "MEDIUM" ? "#eab308" : "#22c55e",
                              fontWeight: "bold",
                              width: 50,
                            }}
                          >
                            {veh.level}
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
            {Object.entries(eventosPorTipo).map(([tipo, cantidad]) => (
              <View key={tipo} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 10 }}>{tipo}</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold" }}>{cantidad}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: "#e5e7eb", borderRadius: 2 }}>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: tipo === "D1" ? "#dc2626" : tipo === "D3" ? "#ea580c" : "#6b7280",
                      width: `${(cantidad / totalEventos) * 100}%`,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            ))}

            <Text style={[styles.subsectionTitle, { marginTop: 15 }]}>Distribución por Franja Horaria</Text>
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
                      backgroundColor: "#3b82f6",
                      width: `${totalEventos > 0 ? (cantidad / totalEventos) * 100 : 0}%`,
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
              <Text style={styles.kpiValue}>{totalEventos.toLocaleString()}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Eventos de Fatiga</Text>
              <Text style={styles.kpiValue}>{eventosFatiga.toLocaleString()}</Text>
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

        <PdfFooter />
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

        <PdfFooter />
      </Page>
    </Document>
  )
}
