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
    color: "#1f2937",
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
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderRadius: 4,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  kpiCardFatiga: {
    width: "48%",
    padding: 15,
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#fecaca",
    borderRadius: 4,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  kpiCardDistraccion: {
    width: "48%",
    padding: 15,
    backgroundColor: "#fffbeb",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#fed7aa",
    borderRadius: 4,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  kpiCardEntidades: {
    width: "48%",
    padding: 15,
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#bae6fd",
    borderRadius: 4,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  kpiLabel: {
    fontSize: 9,
    color: "#4b5563",
    marginBottom: 8,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  kpiValueFatiga: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#991b1b",
    marginBottom: 4,
  },
  kpiValueDistraccion: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#92400e",
    marginBottom: 4,
  },
  kpiValueEntidades: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 4,
  },
  kpiSubtext: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
    fontWeight: "normal",
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

// Función para generar resumen ejecutivo interpretativo (para modo executive)
function generarResumenEjecutivo(
  distribution: ReturnType<typeof countD1D3>,
  factors: ReturnType<typeof computeFactors>,
  vehiculosUnicos: number,
  operadoresUnicos: number,
  allEventos: VehiculoEvento[]
): React.ReactElement {
  // Estado general
  if (distribution.total === 0) {
    return (
      <View>
        <Text style={{ fontSize: 12, lineHeight: 1.8, color: "#1f2937", marginBottom: 12 }}>
          No se registraron eventos de seguridad vial durante el período analizado.
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 1.8, color: "#1f2937" }}>
          El estado general es satisfactorio y no se requieren acciones inmediatas.
        </Text>
      </View>
    )
  }

  // Estado general y nivel de riesgo
  const nivelRiesgo = distribution.total >= 50 ? "elevado" : distribution.total >= 20 ? "moderado" : "bajo"
  
  // Tendencia dominante
  let tendenciaTexto: React.ReactElement
  if (distribution.pctFatiga >= 60) {
    tendenciaTexto = (
      <Text>
        La tendencia dominante es la <Text style={{ fontWeight: "bold" }}>fatiga (D1)</Text>, representando el <Text style={{ fontWeight: "bold" }}>{distribution.pctFatiga.toFixed(1)}%</Text> de los eventos.
      </Text>
    )
  } else if (distribution.pctDistraccion >= 60) {
    tendenciaTexto = (
      <Text>
        La tendencia dominante es la <Text style={{ fontWeight: "bold" }}>distracción (D3)</Text>, representando el <Text style={{ fontWeight: "bold" }}>{distribution.pctDistraccion.toFixed(1)}%</Text> de los eventos.
      </Text>
    )
  } else {
    tendenciaTexto = (
      <Text>
        Los eventos se distribuyen de manera equilibrada entre fatiga (<Text style={{ fontWeight: "bold" }}>{distribution.pctFatiga.toFixed(1)}%</Text>) y distracción (<Text style={{ fontWeight: "bold" }}>{distribution.pctDistraccion.toFixed(1)}%</Text>).
      </Text>
    )
  }

  // Principal foco de atención
  let focoTexto: React.ReactElement
  if (factors.reincidencia > 0) {
    focoTexto = (
      <Text>
        El principal foco de atención es la <Text style={{ fontWeight: "bold" }}>reincidencia detectada en {factors.reincidencia} día{factors.reincidencia !== 1 ? "s" : ""} crítico{factors.reincidencia !== 1 ? "s" : ""}</Text>, lo que indica patrones de comportamiento que requieren intervención.
      </Text>
    )
  } else if (factors.franjaDominante) {
    const horaInicio = factors.franjaDominante.split("-")[0]
    const horaFin = factors.franjaDominante.split("-")[1]
    const porcentajeFranja = ((factors.franjaCount / distribution.total) * 100).toFixed(1)
    focoTexto = (
      <Text>
        El principal foco de atención es la concentración de eventos en la <Text style={{ fontWeight: "bold" }}>franja {horaInicio}–{horaFin} h</Text>, donde se registró el <Text style={{ fontWeight: "bold" }}>{porcentajeFranja}%</Text> del total.
      </Text>
    )
  } else if (distribution.pctFatiga >= 50) {
    focoTexto = (
      <Text>
        El principal foco de atención es la alta incidencia de eventos de fatiga, sugiriendo la necesidad de revisar políticas de descanso y turnos.
      </Text>
    )
  } else {
    focoTexto = (
      <Text>
        El principal foco de atención es mantener los controles preventivos y monitorear la evolución de los indicadores.
      </Text>
    )
  }

  return (
    <View>
      <Text style={{ fontSize: 12, lineHeight: 1.8, color: "#1f2937", marginBottom: 12 }}>
        El estado general de seguridad vehicular presenta un nivel de riesgo <Text style={{ fontWeight: "bold" }}>{nivelRiesgo}</Text> con <Text style={{ fontWeight: "bold" }}>{distribution.total.toLocaleString()} evento{distribution.total !== 1 ? "s" : ""}</Text> registrado{distribution.total !== 1 ? "s" : ""}.
      </Text>
      <Text style={{ fontSize: 12, lineHeight: 1.8, color: "#1f2937", marginBottom: 12 }}>
        {tendenciaTexto}
      </Text>
      <Text style={{ fontSize: 12, lineHeight: 1.8, color: "#1f2937" }}>
        {focoTexto}
      </Text>
    </View>
  )
}

// Función para generar resumen ejecutivo técnico (para modo technical, incluye alertas)
function generarResumenEjecutivoTecnico(
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

  // Segunda parte: Alertas (solo para modo técnico)
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

// Función para generar recomendaciones estratégicas (para modo executive)
function generarRecomendacionesEstrategicas(
  distribution: ReturnType<typeof countD1D3>,
  factors: ReturnType<typeof computeFactors>,
  top3Operadores: Array<{ operador: string; score: { level: string } }>,
  top3Vehiculos: Array<{ vehiculo: string; score: { level: string } }>
): string[] {
  const recomendaciones: string[] = []

  // Recomendaciones basadas en distribución de eventos
  if (distribution.pctFatiga >= 50) {
    recomendaciones.push(
      "Revisar políticas de descanso y turnos prolongados para reducir la incidencia de eventos de fatiga"
    )
  }

  if (distribution.pctDistraccion >= 50) {
    recomendaciones.push(
      "Reforzar campañas de concientización sobre distracción al volante y uso de dispositivos móviles"
    )
  }

  // Recomendaciones basadas en factores de riesgo
  if (factors.reincidencia > 0) {
    recomendaciones.push(
      "Implementar programas de seguimiento y capacitación para operadores con patrones de reincidencia"
    )
  }

  if (factors.franjaDominante) {
    const horaInicio = factors.franjaDominante.split("-")[0]
    const horaFin = factors.franjaDominante.split("-")[1]
    recomendaciones.push(
      `Ajustar estrategias de monitoreo y controles en la franja horaria ${horaInicio}–${horaFin} h donde se concentra el mayor riesgo`
    )
  }

  // Recomendaciones basadas en operadores críticos
  if (top3Operadores.length > 0) {
    recomendaciones.push(
      "Establecer planes de acción específicos para operadores con alto nivel de criticidad identificados en el análisis"
    )
  }

  // Recomendaciones basadas en vehículos críticos
  if (top3Vehiculos.length > 0) {
    recomendaciones.push(
      "Priorizar mantenimiento preventivo y revisión técnica en vehículos con mayor criticidad"
    )
  }

  // Recomendación general si no hay otras específicas
  if (recomendaciones.length === 0) {
    recomendaciones.push(
      "Mantener los controles preventivos actuales y continuar con el monitoreo sistemático de indicadores de seguridad"
    )
  }

  return recomendaciones
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

  // Vehículos únicos (con lista de patentes)
  const vehiculosSet = new Set(
    allEventos
      .map((e) => e.vehiculo?.trim())
      .filter((v) => v && v !== "")
  )
  const vehiculosUnicos = vehiculosSet.size
  const vehiculosLista = Array.from(vehiculosSet).slice(0, 4)
  const vehiculosRestantes = vehiculosUnicos > 4 ? vehiculosUnicos - 4 : 0

  // Operadores únicos (con lista de nombres)
  const operadoresSet = new Set(
    allEventos
      .map((e) => e.operador?.trim())
      .filter((o) => o && o !== "")
  )
  const operadoresUnicos = operadoresSet.size
  const operadoresLista = Array.from(operadoresSet).slice(0, 4)
  const operadoresRestantes = operadoresUnicos > 4 ? operadoresUnicos - 4 : 0

  // Función para formatear identificador de operador (evitar IDs técnicos crudos)
  const formatearOperador = (operador: string): string => {
    // Si parece un ID técnico (solo números o formato técnico), agregar prefijo
    if (/^\d+$/.test(operador) || operador.match(/^[A-Z0-9_-]+$/)) {
      return `Operador ${operador}`
    }
    return operador
  }

  // Velocidad máxima registrada
  const velocidades = allEventos
    .map((e) => e.velocidad)
    .filter((v) => v > 0)
  const velocidadMaxima = velocidades.length > 0 ? Math.max(...velocidades) : 0

  const alertStyles = getAlertStyles(securityAlert.severity)

  // Calcular datos para modo executive
  const operadoresProfiles = mode === "executive" ? computeOperatorRiskProfiles(allEventos) : []
  const vehiculosProfiles = mode === "executive" ? computeVehicleRiskProfiles(allEventos) : []

  // Top 3 operadores y vehículos críticos (solo HIGH)
  const top3Operadores = operadoresProfiles
    .filter((op) => op.score.level === "HIGH")
    .slice(0, 3)
  const top3Vehiculos = vehiculosProfiles
    .filter((veh) => veh.score.level === "HIGH")
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

    // Por franja horaria
    const hora = evento.fecha.getHours()
    if (hora >= 0 && hora < 6) eventosPorFranja["00-06"]++
    else if (hora >= 6 && hora < 12) eventosPorFranja["06-12"]++
    else if (hora >= 12 && hora < 18) eventosPorFranja["12-18"]++
    else if (hora >= 18 && hora < 24) eventosPorFranja["18-24"]++
  })

  // Generar resumen ejecutivo y recomendaciones estratégicas (solo para modo executive)
  const resumenEjecutivoComponente = mode === "executive" 
    ? generarResumenEjecutivo(distribution, factors, vehiculosUnicos, operadoresUnicos, allEventos)
    : null
  const resumenEjecutivoTexto = mode !== "executive"
    ? generarResumenEjecutivoTecnico(distribution, factors, vehiculosUnicos, operadoresUnicos, allEventos, securityAlert)
    : ""
  const recomendacionesEstrategicas = mode === "executive"
    ? generarRecomendacionesEstrategicas(distribution, factors, top3Operadores, top3Vehiculos)
    : []

  if (mode === "executive") {
    // Obtener período analizado (fechas mínima y máxima)
    const fechas = allEventos.map((e) => e.fecha).filter((f) => f)
    const fechaMin = fechas.length > 0 ? new Date(Math.min(...fechas.map((f) => f.getTime()))) : new Date()
    const fechaMax = fechas.length > 0 ? new Date(Math.max(...fechas.map((f) => f.getTime()))) : new Date()
    const periodoAnalizado = fechaMin && fechaMax
      ? `${fechaMin.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })} - ${fechaMax.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}`
      : fechaGeneracion

    return (
      <Document>
        {/* PÁGINA 1 — PORTADA EJECUTIVA */}
        <Page size="A4" style={styles.page}>
          <View style={styles.executiveCover}>
            <Text style={styles.executiveTitle}>REPORTE EJECUTIVO</Text>
            <Text style={styles.executiveSubtitle}>SEGURIDAD VEHICULAR</Text>
            <View style={{ marginTop: 40, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                Período analizado: {periodoAnalizado}
              </Text>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                Fecha de generación: {fechaGeneracion}
              </Text>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                Sistema: ControlMapping
              </Text>
            </View>
          </View>
          <PdfFooter />
        </Page>

        {/* PÁGINA 2 — RESUMEN EJECUTIVO Y ESTADO GENERAL */}
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>RESUMEN EJECUTIVO</Text>
            <View style={{ marginTop: 15 }}>
              {resumenEjecutivoComponente}
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>ESTADO GENERAL Y KPIs</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total de Eventos</Text>
                <Text style={styles.kpiValue}>{distribution.total.toLocaleString()}</Text>
                <Text style={styles.kpiSubtext}>D1 + D3</Text>
              </View>
              <View style={styles.kpiCardFatiga}>
                <Text style={styles.kpiLabel}>% Fatiga (D1)</Text>
                <Text style={styles.kpiValueFatiga}>{distribution.pctFatiga.toFixed(1)}%</Text>
                <Text style={styles.kpiSubtext}>{distribution.d1.toLocaleString()} eventos</Text>
              </View>
              <View style={styles.kpiCardDistraccion}>
                <Text style={styles.kpiLabel}>% Distracción (D3)</Text>
                <Text style={styles.kpiValueDistraccion}>{distribution.pctDistraccion.toFixed(1)}%</Text>
                <Text style={styles.kpiSubtext}>{distribution.d3.toLocaleString()} eventos</Text>
              </View>
              <View style={styles.kpiCardEntidades}>
                <Text style={styles.kpiLabel}>Vehículos Únicos</Text>
                <Text style={styles.kpiValueEntidades}>{vehiculosUnicos.toLocaleString()}</Text>
                <Text style={styles.kpiSubtext}>Involucrados</Text>
                {vehiculosLista.length > 0 && (
                  <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4, lineHeight: 1.3 }}>
                    {vehiculosLista.join(" · ")}
                    {vehiculosRestantes > 0 && ` +${vehiculosRestantes} más`}
                  </Text>
                )}
              </View>
              <View style={styles.kpiCardEntidades}>
                <Text style={styles.kpiLabel}>Operadores Únicos</Text>
                <Text style={styles.kpiValueEntidades}>{operadoresUnicos.toLocaleString()}</Text>
                <Text style={styles.kpiSubtext}>Involucrados</Text>
                {operadoresLista.length > 0 && (
                  <Text style={{ fontSize: 8, color: "#64748b", marginTop: 4, lineHeight: 1.3 }}>
                    {operadoresLista.map(formatearOperador).join(" · ")}
                    {operadoresRestantes > 0 && ` +${operadoresRestantes} más`}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <PdfFooter />
        </Page>

        {/* PÁGINA 3 — DISTRIBUCIÓN DE RIESGOS */}
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>DISTRIBUCIÓN DE RIESGOS</Text>
            
            <Text style={[styles.subsectionTitle, { marginTop: 15 }]}>Distribución por Tipo de Evento</Text>
            {distribution.d1 > 0 && (
              <View style={{ marginBottom: 15 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                  <Text style={{ fontSize: 11 }}>Fatiga (D1)</Text>
                  <Text style={{ fontSize: 11, fontWeight: "bold" }}>
                    {distribution.d1} ({distribution.pctFatiga.toFixed(1)}%)
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 2 }}>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: "#dc2626",
                      width: `${distribution.pctFatiga}%`,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            )}
            {distribution.d3 > 0 && (
              <View style={{ marginBottom: 15 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                  <Text style={{ fontSize: 11 }}>Distracción (D3)</Text>
                  <Text style={{ fontSize: 11, fontWeight: "bold" }}>
                    {distribution.d3} ({distribution.pctDistraccion.toFixed(1)}%)
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 2 }}>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: "#ea580c",
                      width: `${distribution.pctDistraccion}%`,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            )}

            {Object.values(eventosPorFranja).some((v) => v > 0) && (
              <>
                <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Distribución por Franja Horaria</Text>
                {Object.entries(eventosPorFranja)
                  .filter(([_, cantidad]) => cantidad > 0)
                  .map(([franja, cantidad]) => {
                    const porcentaje = distribution.total > 0 ? (cantidad / distribution.total) * 100 : 0
                    return (
                      <View key={franja} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ fontSize: 11 }}>{franja}h</Text>
                          <Text style={{ fontSize: 11, fontWeight: "bold" }}>
                            {cantidad} ({porcentaje.toFixed(1)}%)
                          </Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 2 }}>
                          <View
                            style={{
                              height: 8,
                              backgroundColor: franja === factors.franjaDominante ? "#dc2626" : "#3b82f6",
                              width: `${porcentaje}%`,
                              borderRadius: 2,
                            }}
                          />
                        </View>
                      </View>
                    )
                  })}
              </>
            )}
          </View>
          <PdfFooter />
        </Page>

        {/* PÁGINA 4 — FOCOS DE ATENCIÓN */}
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>FOCOS DE ATENCIÓN</Text>
            <Text style={[styles.text, { fontSize: 10, color: "#6b7280", marginBottom: 20, fontStyle: "italic" }]}>
              Prioridades identificadas para intervención inmediata
            </Text>
            
            {top3Operadores.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Top 3 Operadores con Mayor Criticidad</Text>
                {top3Operadores.map((op, idx) => {
                  const motivoPrincipal = op.distribution.d1 > op.distribution.d3 ? "Fatiga (D1)" : op.distribution.d3 > op.distribution.d1 ? "Distracción (D3)" : "Mixto"
                  return (
                    <View key={op.operador} style={[styles.priorityCard, { marginBottom: 12 }]}>
                      <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>
                        #{idx + 1} - {op.operador}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#374151", marginBottom: 4 }}>
                        Nivel de severidad: <Text style={{ fontWeight: "bold", color: "#dc2626" }}>{op.score.level}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, color: "#374151" }}>
                        Motivo principal: <Text style={{ fontWeight: "bold" }}>{motivoPrincipal}</Text>
                      </Text>
                      {op.factors.reincidencia > 0 && (
                        <Text style={{ fontSize: 9, color: "#6b7280", marginTop: 4 }}>
                          Reincidencia detectada: {op.factors.reincidencia} día{op.factors.reincidencia !== 1 ? "s" : ""} crítico{op.factors.reincidencia !== 1 ? "s" : ""}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </>
            )}

            {top3Vehiculos.length > 0 && (
              <>
                <Text style={[styles.subsectionTitle, { marginTop: top3Operadores.length > 0 ? 20 : 0 }]}>
                  Top 3 Vehículos con Mayor Criticidad
                </Text>
                {top3Vehiculos.map((veh, idx) => {
                  const motivoPrincipal = veh.distribution.d1 > veh.distribution.d3 ? "Fatiga (D1)" : veh.distribution.d3 > veh.distribution.d1 ? "Distracción (D3)" : "Mixto"
                  return (
                    <View key={veh.vehiculo} style={[styles.priorityCard, { marginBottom: 12 }]}>
                      <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>
                        #{idx + 1} - {veh.vehiculo}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#374151", marginBottom: 4 }}>
                        Nivel de severidad: <Text style={{ fontWeight: "bold", color: "#dc2626" }}>{veh.score.level}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, color: "#374151" }}>
                        Motivo principal: <Text style={{ fontWeight: "bold" }}>{motivoPrincipal}</Text>
                      </Text>
                      {veh.factors.reincidencia > 0 && (
                        <Text style={{ fontSize: 9, color: "#6b7280", marginTop: 4 }}>
                          Reincidencia detectada: {veh.factors.reincidencia} día{veh.factors.reincidencia !== 1 ? "s" : ""} crítico{veh.factors.reincidencia !== 1 ? "s" : ""}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </>
            )}

            {top3Operadores.length === 0 && top3Vehiculos.length === 0 && (
              <Text style={[styles.text, { fontSize: 11, color: "#6b7280", fontStyle: "italic" }]}>
                No se identificaron operadores o vehículos con nivel de criticidad HIGH durante el período analizado.
              </Text>
            )}
          </View>
          <PdfFooter />
        </Page>

        {/* PÁGINA 5 — INTERPRETACIÓN Y RECOMENDACIONES */}
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionSpacer}>
            <Text style={styles.sectionTitle}>INTERPRETACIÓN Y RECOMENDACIONES</Text>
            
            <Text style={[styles.subsectionTitle, { marginTop: 15 }]}>Interpretación Técnica</Text>
            <Text style={[styles.text, { fontSize: 11, lineHeight: 1.7, marginBottom: 20 }]}>
              {distribution.total === 0 
                ? "El análisis del período no muestra eventos de seguridad vial registrados, indicando un estado operativo estable."
                : `El escenario observado muestra ${distribution.total} evento${distribution.total !== 1 ? "s" : ""} de seguridad vial, con una distribución ${distribution.pctFatiga >= 50 ? "predominante de fatiga" : distribution.pctDistraccion >= 50 ? "predominante de distracción" : "equilibrada"} entre ambos tipos de eventos. ${factors.reincidencia > 0 ? `Se detectaron ${factors.reincidencia} día${factors.reincidencia !== 1 ? "s" : ""} con reincidencia, lo que sugiere patrones de comportamiento que requieren atención.` : ""} ${factors.franjaDominante ? `La concentración temporal en la franja ${factors.franjaDominante}h indica posibles factores operativos o ambientales específicos de ese horario.` : ""}`}
            </Text>

            <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Recomendaciones Estratégicas</Text>
            {recomendacionesEstrategicas.length > 0 ? (
              recomendacionesEstrategicas.map((rec, idx) => (
                <View key={idx} style={[styles.recommendationBox, { marginBottom: 12 }]}>
                  <Text style={{ fontSize: 11, lineHeight: 1.6 }}>
                    {idx + 1}. {rec}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.text, { fontSize: 11, color: "#6b7280", fontStyle: "italic" }]}>
                No se requieren recomendaciones específicas en este momento. Se recomienda mantener los controles preventivos actuales.
              </Text>
            )}
          </View>
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

      {/* Alertas de Seguridad (Componente chico - NO SPLITTABLE) */}
      <Page size="A4" style={styles.page}>
        <View wrap={false} break style={styles.section}>
          <View wrap={false} minPresenceAhead={150}>
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
        </View>

        <PdfFooter />
      </Page>

      {/* Resumen Ejecutivo del Período (Componente grande - SPLITTABLE) */}
      <Page size="A4" style={styles.page}>
        <View break style={styles.section}>
          <View wrap={false} minPresenceAhead={150}>
            <Text style={styles.sectionTitle}>RESUMEN EJECUTIVO DEL PERÍODO</Text>
          </View>

          <View wrap={false} minPresenceAhead={100}>
            <Text style={styles.subsectionTitle}>Análisis Interpretativo</Text>
            <Text style={[styles.text, { marginBottom: 20, lineHeight: 1.8 }]}>
              {resumenEjecutivoTexto}
            </Text>
          </View>

          <View wrap={false} minPresenceAhead={200}>
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
          </View>
          
          {/* Factores de Riesgo */}
          {(factors.altaVelocidad > 0 || factors.reincidencia > 0 || factors.franjaDominante) && (
            <View wrap={false} minPresenceAhead={100} style={{ marginTop: 15, padding: 12, backgroundColor: "#fffbeb", borderRadius: 4 }}>
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

      {/* Análisis de Eventos (Componente grande - SPLITTABLE) */}
      <Page size="A4" style={styles.page}>
        <View break style={styles.section}>
          <View wrap={false} minPresenceAhead={150}>
            <Text style={styles.sectionTitle}>ANÁLISIS DE EVENTOS</Text>
          </View>

          <View wrap={false} minPresenceAhead={100}>
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
          </View>

          <View wrap={false} minPresenceAhead={200}>
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
          </View>

          <View wrap={false} minPresenceAhead={50}>
            <Text style={styles.text}>
              Estos indicadores proporcionan una visión general del estado de seguridad vehicular
              y permiten identificar áreas que requieren atención inmediata o seguimiento continuo.
            </Text>
          </View>
        </View>

        <PdfFooter />
      </Page>

      {/* Resumen Ejecutivo (Componente chico - NO SPLITTABLE) */}
      <Page size="A4" style={styles.page}>
        <View wrap={false} break style={styles.section}>
          <View wrap={false} minPresenceAhead={200}>
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
        </View>

        <PdfFooter />
      </Page>
    </Document>
  )
}
