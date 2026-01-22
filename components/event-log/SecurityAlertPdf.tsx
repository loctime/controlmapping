import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import type { SecurityAlert } from "./securityAlerts"
import { countD1D3 } from "./riskModel"

interface SecurityAlertPdfProps {
  allEventos: VehiculoEvento[]
  securityAlert: SecurityAlert
  kpisEjecutivos: {
    eventosCriticos: number
    eventosFatiga: number
    vehiculosUnicos: number
    operadoresUnicos: number
    velocidadMaxima: number
  }
}

type NivelRiesgo = "ALTO" | "MEDIO" | "BAJO"

// Estilos del PDF - Diseño preventivo compacto (SIEMPRE 1 página)
const styles = StyleSheet.create({
  page: {
    padding: 20,
    paddingBottom: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  // Encabezado
  header: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 6,
    textAlign: "center",
  },
  headerBadgeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 6,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: "bold",
  },
  badgeAlto: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },
  badgeMedio: {
    backgroundColor: "#FED7AA",
    color: "#9A3412",
  },
  badgeBajo: {
    backgroundColor: "#FEF3C7",
    color: "#78350F",
  },
  headerDate: {
    fontSize: 9,
    color: "#6B7280",
    textAlign: "center",
  },
  // Sección: Hecho concreto
  hechoSection: {
    marginBottom: 12,
  },
  hechoTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 10,
  },
  hechoCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  hechoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  hechoRowLast: {
    flexDirection: "row",
  },
  hechoLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#4b5563",
    width: "40%",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  hechoValue: {
    fontSize: 10,
    color: "#1f2937",
    flex: 1,
    fontWeight: "600",
  },
  // Sección: Por qué es un riesgo
  riesgoSection: {
    marginBottom: 12,
  },
  riesgoTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  riesgoText: {
    fontSize: 10,
    color: "#1f2937",
    lineHeight: 1.6,
    textAlign: "justify",
  },
  // Sección: Contexto mínimo
  contextoSection: {
    marginBottom: 12,
  },
  contextoText: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.5,
    fontStyle: "italic",
  },
  // Sección: Recomendación inmediata
  recomendacionSection: {
    marginBottom: 12,
  },
  recomendacionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  recomendacionList: {
    marginLeft: 4,
  },
  recomendacionItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingLeft: 4,
  },
  recomendacionBullet: {
    fontSize: 10,
    color: "#2563eb",
    marginRight: 8,
    width: 14,
    fontWeight: "bold",
  },
  recomendacionText: {
    fontSize: 10,
    color: "#1f2937",
    lineHeight: 1.5,
    flex: 1,
  },
  // Cierre institucional
  cierreSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderTopStyle: "solid",
  },
  cierreText: {
    fontSize: 7,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 1.4,
  },
})

/**
 * Formatea una fecha a formato legible (DD/MM/YYYY)
 */
function formatFecha(fecha: Date): string {
  const day = String(fecha.getDate()).padStart(2, "0")
  const month = String(fecha.getMonth() + 1).padStart(2, "0")
  const year = fecha.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Formatea fecha y hora a formato legible (DD/MM/YYYY HH:mm)
 */
function formatFechaHora(fecha: Date): string {
  const day = String(fecha.getDate()).padStart(2, "0")
  const month = String(fecha.getMonth() + 1).padStart(2, "0")
  const year = fecha.getFullYear()
  const hours = String(fecha.getHours()).padStart(2, "0")
  const minutes = String(fecha.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Valida si una dirección tiene formato textual real (no solo números)
 */
function esDireccionValida(direccion: string): boolean {
  if (!direccion || direccion.trim() === "") return false
  
  const dirTrimmed = direccion.trim()
  
  if (/^\d+$/.test(dirTrimmed)) return false
  if (dirTrimmed.length < 3) return false
  
  return /[a-zA-Z]/.test(dirTrimmed)
}

/**
 * Formatea la ubicación del evento
 */
function formatUbicacion(evento: VehiculoEvento): string {
  if (evento.direccion && esDireccionValida(evento.direccion)) {
    return evento.direccion.trim()
  }

  const lat = evento.latitud
  const lon = evento.longitud
  
  if (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    isFinite(lat) &&
    isFinite(lon)
  ) {
    return `Lat: ${lat.toFixed(6)}, Long: ${lon.toFixed(6)}`
  }

  return "Ubicación no disponible"
}

/**
 * Obtiene el nombre del tipo de evento para el subtítulo
 */
function obtenerTipoEvento(evento: VehiculoEvento): string {
  const eventoCode = evento.evento?.trim()
  
  if (eventoCode === "D1") {
    return "Microsueño"
  }
  
  if (eventoCode === "D3") {
    return "Distracción"
  }
  
  // Si tiene velocidad >= 80, puede considerarse exceso de velocidad
  if (evento.velocidad >= 80) {
    return "Exceso de velocidad"
  }
  
  return "Evento de seguridad vial"
}

/**
 * Determina el nivel de riesgo del evento individual
 * Basado en tipo de evento y velocidad
 */
function determinarNivelRiesgo(evento: VehiculoEvento): NivelRiesgo {
  const eventoCode = evento.evento?.trim()
  const velocidad = evento.velocidad || 0
  
  // ALTO: D1 (Microsueño) con velocidad >= 80, o D1 sin importar velocidad
  if (eventoCode === "D1") {
    return "ALTO"
  }
  
  // MEDIO: D3 (Distracción) con velocidad >= 80, o D3 sin velocidad alta
  if (eventoCode === "D3") {
    if (velocidad >= 80) {
      return "ALTO"
    }
    return "MEDIO"
  }
  
  // BAJO: Otros casos (exceso de velocidad sin D1/D3)
  if (velocidad >= 80) {
    return "MEDIO"
  }
  
  return "BAJO"
}

/**
 * Selecciona el evento más crítico del período según prioridad:
 * 1. Microsueño (D1)
 * 2. Distracción (D3)
 * 3. Exceso de velocidad (velocidad >= 80)
 * 
 * Si hay empate, prioriza mayor velocidad, luego más reciente
 */
function seleccionarEventoMasCritico(eventos: VehiculoEvento[]): VehiculoEvento | null {
  if (eventos.length === 0) return null

  // Filtrar eventos válidos (D1, D3, o con velocidad >= 80)
  const eventosValidos = eventos.filter(
    (e) => {
      const eventoCode = e.evento?.trim()
      const tieneVelocidadAlta = (e.velocidad || 0) >= 80
      
      return (
        ((eventoCode === "D1" || eventoCode === "D3") &&
         e.operador &&
         e.operador.trim() !== "" &&
         e.vehiculo &&
         e.vehiculo.trim() !== "") ||
        (tieneVelocidadAlta &&
         e.operador &&
         e.operador.trim() !== "" &&
         e.vehiculo &&
         e.vehiculo.trim() !== "")
      )
    }
  )

  if (eventosValidos.length === 0) return null

  // Ordenar por prioridad
  const eventosOrdenados = [...eventosValidos].sort((a, b) => {
    const codigoA = a.evento?.trim()
    const codigoB = b.evento?.trim()
    const velocidadA = a.velocidad || 0
    const velocidadB = b.velocidad || 0
    
    // Prioridad 1: D1 sobre D3 sobre otros
    const esD1A = codigoA === "D1"
    const esD1B = codigoB === "D1"
    const esD3A = codigoA === "D3"
    const esD3B = codigoB === "D3"
    
    if (esD1A && !esD1B) return -1
    if (!esD1A && esD1B) return 1
    if (esD3A && !esD3B) return -1
    if (!esD3A && esD3B) return 1
    
    // Prioridad 2: Mayor velocidad
    if (velocidadA !== velocidadB) {
      return velocidadB - velocidadA
    }
    
    // Prioridad 3: Más reciente
    return b.fecha.getTime() - a.fecha.getTime()
  })

  return eventosOrdenados[0]
}

/**
 * Genera texto explicativo sobre por qué el evento es un riesgo (con formato React)
 */
function generarTextoRiesgo(evento: VehiculoEvento): React.ReactElement {
  const eventoCode = evento.evento?.trim()
  const velocidad = evento.velocidad || 0
  
  if (eventoCode === "D1") {
    if (velocidad >= 80) {
      return (
        <Text>
          Este tipo de evento está asociado a <Text style={{ fontWeight: "bold" }}>fatiga y disminución de reflejos</Text>, incrementando significativamente el riesgo de siniestros viales, especialmente cuando ocurre a <Text style={{ fontWeight: "bold" }}>alta velocidad</Text> en trayectos prolongados o nocturnos.
        </Text>
      )
    }
    return (
      <Text>
        Este tipo de evento está asociado a <Text style={{ fontWeight: "bold" }}>fatiga y disminución de reflejos</Text>, incrementando significativamente el riesgo de siniestros viales, especialmente en trayectos prolongados o nocturnos.
      </Text>
    )
  }
  
  if (eventoCode === "D3") {
    if (velocidad >= 80) {
      return (
        <Text>
          Este tipo de evento indica <Text style={{ fontWeight: "bold" }}>distracción del conductor</Text>, reduciendo su capacidad de reacción ante situaciones imprevistas, lo cual se agrava cuando ocurre a <Text style={{ fontWeight: "bold" }}>alta velocidad</Text> aumentando el riesgo de colisiones.
        </Text>
      )
    }
    return (
      <Text>
        Este tipo de evento indica <Text style={{ fontWeight: "bold" }}>distracción del conductor</Text>, reduciendo su capacidad de reacción ante situaciones imprevistas y aumentando el riesgo de colisiones.
      </Text>
    )
  }
  
  if (velocidad >= 80) {
    return (
      <Text>
        El <Text style={{ fontWeight: "bold" }}>exceso de velocidad</Text> reduce significativamente el tiempo de reacción del conductor y aumenta la severidad de posibles siniestros viales.
      </Text>
    )
  }
  
  return (
    <Text>
      Este evento representa un riesgo para la seguridad vial y requiere atención preventiva.
    </Text>
  )
}

/**
 * Genera recomendaciones inmediatas según el tipo de evento
 */
function generarRecomendaciones(evento: VehiculoEvento): string[] {
  const eventoCode = evento.evento?.trim()
  const velocidad = evento.velocidad || 0
  const recomendaciones: string[] = []
  
  if (eventoCode === "D1") {
    recomendaciones.push("Reforzar pausas de descanso para el conductor involucrado")
    recomendaciones.push("Revisar extensión de turnos y horarios de trabajo")
    recomendaciones.push("Realizar concientización sobre fatiga y sus riesgos")
  } else if (eventoCode === "D3") {
    recomendaciones.push("Realizar concientización con el conductor sobre distracciones al volante")
    recomendaciones.push("Revisar políticas de uso de dispositivos durante la conducción")
    recomendaciones.push("Evaluar condiciones de trabajo que puedan generar distracciones")
  } else if (velocidad >= 80) {
    recomendaciones.push("Reforzar cumplimiento de límites de velocidad establecidos")
    recomendaciones.push("Realizar concientización sobre riesgos del exceso de velocidad")
    recomendaciones.push("Revisar sistemas de monitoreo y alertas de velocidad")
  } else {
    recomendaciones.push("Revisar protocolos de seguridad vial")
    recomendaciones.push("Realizar concientización preventiva con el conductor")
    recomendaciones.push("Evaluar condiciones operativas del vehículo")
  }
  
  // Limitar a máximo 3 recomendaciones
  return recomendaciones.slice(0, 3)
}

/**
 * Genera contexto mínimo opcional (máximo 2 líneas)
 */
function generarContextoMinimo(
  evento: VehiculoEvento,
  allEventos: VehiculoEvento[]
): string | null {
  const distribution = countD1D3(allEventos)
  const eventoCode = evento.evento?.trim()
  
  if (distribution.total === 0) return null
  
  // Calcular porcentaje del tipo de evento
  if (eventoCode === "D1" && distribution.d1 > 0) {
    const porcentaje = Math.round((distribution.d1 / distribution.total) * 100)
    return `Este tipo de evento representa el ${porcentaje}% de los eventos críticos del período.`
  }
  
  if (eventoCode === "D3" && distribution.d3 > 0) {
    const porcentaje = Math.round((distribution.d3 / distribution.total) * 100)
    return `Este tipo de evento representa el ${porcentaje}% de los eventos críticos del período.`
  }
  
  // Si no aporta claridad, omitir
  return null
}

export const SecurityAlertPdf: React.FC<SecurityAlertPdfProps> = ({
  allEventos,
  securityAlert,
  kpisEjecutivos,
}) => {
  // Seleccionar el evento más crítico
  const eventoCritico = seleccionarEventoMasCritico(allEventos)
  
  // Si no hay evento crítico, mostrar mensaje genérico
  if (!eventoCritico) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ALERTA DE SEGURIDAD VIAL</Text>
            <Text style={styles.headerDate}>
              {formatFecha(new Date())} - No se detectaron eventos críticos en el período
            </Text>
          </View>
          <View style={styles.cierreSection}>
            <Text style={styles.cierreText}>
              Este documento forma parte del sistema de gestión preventiva de seguridad vial
              y tiene carácter informativo y preventivo.
            </Text>
          </View>
        </Page>
      </Document>
    )
  }
  
  const nivelRiesgo = determinarNivelRiesgo(eventoCritico)
  const tipoEvento = obtenerTipoEvento(eventoCritico)
  const textoRiesgo = generarTextoRiesgo(eventoCritico)
  const recomendaciones = generarRecomendaciones(eventoCritico)
  const contextoMinimo = generarContextoMinimo(eventoCritico, allEventos)
  
  // Estilos del badge según nivel de riesgo
  const badgeStyle = 
    nivelRiesgo === "ALTO" ? styles.badgeAlto :
    nivelRiesgo === "MEDIO" ? styles.badgeMedio :
    styles.badgeBajo
  
  const badgeEmoji = 
    nivelRiesgo === "ALTO" ? "🔴" :
    nivelRiesgo === "MEDIO" ? "🟠" :
    "🟡"

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 1) ENCABEZADO */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ALERTA DE SEGURIDAD VIAL</Text>
          <Text style={styles.headerSubtitle}>{tipoEvento}</Text>
          <View style={styles.headerBadgeContainer}>
            <View style={[styles.headerBadge, badgeStyle]}>
              <Text>{badgeEmoji} {nivelRiesgo}</Text>
            </View>
          </View>
          <Text style={styles.headerDate}>
            {formatFechaHora(eventoCritico.fecha)}
          </Text>
        </View>

        {/* 2) HECHO CONCRETO */}
        <View style={styles.hechoSection}>
          <Text style={styles.hechoTitle}>Hecho concreto</Text>
          <View style={styles.hechoCard}>
            <View style={styles.hechoRow}>
              <Text style={styles.hechoLabel}>Vehículo / Unidad:</Text>
              <Text style={styles.hechoValue}>{eventoCritico.vehiculo || "N/A"}</Text>
            </View>
            <View style={styles.hechoRow}>
              <Text style={styles.hechoLabel}>Conductor / Operador:</Text>
              <Text style={styles.hechoValue}>{eventoCritico.operador || "N/A"}</Text>
            </View>
            <View style={styles.hechoRow}>
              <Text style={styles.hechoLabel}>Fecha y hora:</Text>
              <Text style={styles.hechoValue}>{formatFechaHora(eventoCritico.fecha)}</Text>
            </View>
            <View style={styles.hechoRow}>
              <Text style={styles.hechoLabel}>Ubicación / Tramo:</Text>
              <Text style={styles.hechoValue}>{formatUbicacion(eventoCritico)}</Text>
            </View>
            <View style={styles.hechoRow}>
              <Text style={styles.hechoLabel}>Velocidad registrada:</Text>
              <Text style={styles.hechoValue}>
                {eventoCritico.velocidad > 0 ? `${eventoCritico.velocidad} km/h` : "N/A"}
              </Text>
            </View>
            <View style={styles.hechoRowLast}>
              <Text style={styles.hechoLabel}>Tipo de evento detectado:</Text>
              <Text style={styles.hechoValue}>{tipoEvento}</Text>
            </View>
          </View>
        </View>

        {/* 3) POR QUÉ ES UN RIESGO */}
        <View style={styles.riesgoSection}>
          <Text style={styles.riesgoTitle}>Por qué es un riesgo</Text>
          <View style={{ backgroundColor: "#fef2f2", borderLeftWidth: 3, borderLeftColor: "#dc2626", padding: 10, borderRadius: 2 }}>
            <View style={styles.riesgoText}>
              {textoRiesgo}
            </View>
          </View>
        </View>

        {/* 4) CONTEXTO MÍNIMO (opcional) */}
        {contextoMinimo && (
          <View style={styles.contextoSection}>
            <Text style={styles.contextoText}>{contextoMinimo}</Text>
          </View>
        )}

        {/* 5) RECOMENDACIÓN INMEDIATA */}
        <View style={styles.recomendacionSection}>
          <Text style={styles.recomendacionTitle}>Recomendación inmediata</Text>
          <View style={{ backgroundColor: "#eff6ff", borderLeftWidth: 3, borderLeftColor: "#2563eb", padding: 10, borderRadius: 2 }}>
            <View style={styles.recomendacionList}>
              {recomendaciones.map((rec, index) => (
                <View key={index} style={styles.recomendacionItem}>
                  <Text style={styles.recomendacionBullet}>•</Text>
                  <Text style={styles.recomendacionText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 6) CIERRE INSTITUCIONAL */}
        <View style={styles.cierreSection}>
          <Text style={styles.cierreText}>
            Este documento forma parte del sistema de gestión preventiva de seguridad vial
            y tiene carácter informativo y preventivo.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
