import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import type { SecurityAlert } from "./securityAlerts"
import { dominantTimeBand, countD1D3, computeFactors } from "./riskModel"

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

// Estilos del PDF - Diseño preventivo y visual (optimizado para una sola hoja)
const styles = StyleSheet.create({
  page: {
    padding: 25,
    paddingBottom: 50, // Espacio para footer
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  // Header rojo
  header: {
    backgroundColor: "#DC2626",
    padding: 15,
    marginBottom: 15,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  headerDate: {
    fontSize: 9,
    color: "#FEE2E2",
    textAlign: "center",
  },
  // Bloque principal de alerta
  alertBlock: {
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#DC2626",
    padding: 14,
    marginBottom: 15,
    borderRadius: 4,
  },
  alertText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#991B1B",
    marginBottom: 10,
    lineHeight: 1.5,
    textAlign: "center",
  },
  alertDetails: {
    fontSize: 10,
    color: "#7F1D1D",
    marginBottom: 5,
    lineHeight: 1.4,
    textAlign: "center",
  },
  // Cards de KPIs
  kpiSection: {
    marginBottom: 15,
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
    textAlign: "center",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 3,
  },
  kpiLabel: {
    fontSize: 8,
    color: "#6B7280",
    lineHeight: 1.2,
    fontWeight: "bold",
  },
  // Contexto preventivo
  contextBlock: {
    backgroundColor: "#FFFBEB",
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
    borderLeftColor: "#F59E0B",
    padding: 12,
    marginBottom: 15,
    borderRadius: 2,
  },
  contextText: {
    fontSize: 9,
    color: "#78350F",
    lineHeight: 1.5,
  },
  // Detalle del evento crítico
  detailSection: {
    marginBottom: 15,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
  },
  detailTable: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
    borderRadius: 4,
  },
  detailRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  detailRowLast: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    width: "35%",
  },
  detailValue: {
    fontSize: 9,
    color: "#6B7280",
    flex: 1,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 15,
    left: 25,
    right: 25,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderTopStyle: "solid",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#9CA3AF",
    flex: 1,
  },
  footerPage: {
    fontSize: 7,
    color: "#9CA3AF",
  },
})

// Usar función del modelo de riesgo para calcular franja horaria

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
 * Formatea solo la hora (HH:mm)
 */
function formatHora(fecha: Date): string {
  const hours = String(fecha.getHours()).padStart(2, "0")
  const minutes = String(fecha.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

/**
 * Selecciona el evento más grave según prioridad:
 * SOLO considera eventos D1 (Fatiga) y D3 (Distracción) - los únicos eventos reales.
 * Prioridad:
 * 1) Mayor velocidad
 * 2) Evento D1 sobre D3
 * 3) Evento más reciente
 */
function seleccionarEventoMasGrave(eventos: VehiculoEvento[]): VehiculoEvento | null {
  if (eventos.length === 0) return null

  // Filtrar SOLO eventos D1 y D3 válidos (los únicos eventos reales)
  const eventosValidos = eventos.filter(
    (e) => {
      const eventoCode = e.evento?.trim()
      return (
        (eventoCode === "D1" || eventoCode === "D3") &&
        e.operador &&
        e.operador.trim() !== "" &&
        e.vehiculo &&
        e.vehiculo.trim() !== ""
      )
    }
  )

  if (eventosValidos.length === 0) return null

  // Ordenar por prioridad
  const eventosOrdenados = [...eventosValidos].sort((a, b) => {
    // 1) Prioridad: Mayor velocidad
    if (a.velocidad !== b.velocidad) {
      return b.velocidad - a.velocidad
    }

    // 2) Prioridad: D1 sobre D3
    const esD1A = a.evento?.trim() === "D1"
    const esD1B = b.evento?.trim() === "D1"

    if (esD1A && !esD1B) return -1
    if (!esD1A && esD1B) return 1

    // 3) Prioridad: Evento más reciente
    return b.fecha.getTime() - a.fecha.getTime()
  })

  return eventosOrdenados[0]
}

/**
 * Valida si una dirección tiene formato textual real (no solo números)
 */
function esDireccionValida(direccion: string): boolean {
  if (!direccion || direccion.trim() === "") return false
  
  const dirTrimmed = direccion.trim()
  
  // Rechazar si es solo números o strings numéricos ambiguos
  if (/^\d+$/.test(dirTrimmed)) return false
  
  // Rechazar si es muy corta (menos de 3 caracteres)
  if (dirTrimmed.length < 3) return false
  
  // Aceptar si tiene al menos una letra
  return /[a-zA-Z]/.test(dirTrimmed)
}

/**
 * Formatea la ubicación del evento
 * Solo muestra dirección si tiene formato textual real, sino muestra coordenadas
 */
function formatUbicacion(evento: VehiculoEvento): string {
  // Validar que la dirección tenga formato textual real
  if (evento.direccion && esDireccionValida(evento.direccion)) {
    return evento.direccion.trim()
  }

  // Si no hay dirección válida, mostrar coordenadas
  // Validar que las coordenadas sean válidas (no NaN, no infinitas)
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
 * Valida si un texto es "humano válido" (no IDs, no patentes, no códigos).
 * Rechaza:
 * - Solo números
 * - Patentes (formato común: letras y números cortos)
 * - IDs técnicos
 * - Textos muy cortos sin contexto
 */
function esTextoHumanoValido(texto: string): boolean {
  if (!texto || texto.trim() === "") return false
  
  const trimmed = texto.trim()
  
  // Rechazar si es muy corto (menos de 5 caracteres)
  if (trimmed.length < 5) return false
  
  // Rechazar si es solo números
  if (/^\d+$/.test(trimmed)) return false
  
  // Rechazar si parece patente (formato común: 3-4 letras seguidas de números, o viceversa)
  if (/^[A-Z]{1,4}\d{1,4}$/i.test(trimmed) || /^\d{1,4}[A-Z]{1,4}$/i.test(trimmed)) return false
  
  // Rechazar si parece ID técnico (solo letras mayúsculas cortas o códigos)
  if (/^[A-Z]{1,6}$/.test(trimmed) && trimmed.length <= 6) return false
  
  // Aceptar si tiene al menos una palabra con contexto (letras y espacios, o texto descriptivo)
  return /[a-zA-Z]{3,}/.test(trimmed) && trimmed.length >= 5
}

/**
 * Obtiene la descripción legible del evento.
 * SOLO maneja eventos D1 (Fatiga) y D3 (Distracción) - los únicos eventos reales.
 * 
 * REGLAS:
 * - D1 → "Fatiga – Parpadeo pesado" (o descripción válida si existe)
 * - D3 → "Distracción – Sin mirar al frente" (o descripción válida si existe)
 * - NO usar valores de vehículo como descripción
 * - Solo usar descripcion/texto si contiene texto humano válido (no IDs, no patentes)
 */
function obtenerDescripcionEvento(evento: VehiculoEvento): string {
  const eventoCode = evento.evento?.trim()
  
  // Validar que sea un evento real (D1 o D3)
  if (eventoCode !== "D1" && eventoCode !== "D3") {
    // Si no es D1/D3 válido, no debería llegar aquí en el flujo normal
    // pero por seguridad, retornar descripción genérica
    return "Evento de seguridad vial"
  }

  // Evento D1 (Fatiga)
  if (eventoCode === "D1") {
    // Intentar usar descripción/texto solo si es texto humano válido
    const descripcion = evento.descripcion?.trim() || evento.texto?.trim() || ""
    if (descripcion && esTextoHumanoValido(descripcion)) {
      return `Fatiga – ${descripcion}`
    }
    // Fallback: usar descripción estándar
    return "Fatiga – Parpadeo pesado"
  }

  // Evento D3 (Distracción)
  if (eventoCode === "D3") {
    // Intentar usar descripción/texto solo si es texto humano válido
    const descripcion = evento.descripcion?.trim() || evento.texto?.trim() || ""
    if (descripcion && esTextoHumanoValido(descripcion)) {
      return `Distracción – ${descripcion}`
    }
    // Fallback: usar descripción estándar
    return "Distracción – Sin mirar al frente"
  }

  // No debería llegar aquí
  return "Evento de seguridad vial"
}

/**
 * Analiza los eventos reales y genera texto de contexto preventivo
 * basado únicamente en eventos reales (D1/D3) y factores de severidad.
 * 
 * SEPARA CLARAMENTE:
 * - Eventos reales (D1/D3): los únicos eventos que existen
 * - Factores agravantes (velocidad, reincidencia, franja horaria): NO son eventos
 * 
 * NO trata factores como eventos.
 */
function generarContextoPreventivo(
  eventos: VehiculoEvento[],
  eventosFatiga: number,
  velocidadMaxima: number,
  franjaMasRiesgosa: string | null
): string {
  if (eventos.length === 0) {
    return "No hay eventos registrados en el período analizado."
  }

  const distribution = countD1D3(eventos)
  const factors = computeFactors(eventos)

  // Construir texto separando claramente eventos reales de factores agravantes
  const partesEventos: string[] = []
  const partesFactores: string[] = []

  // EVENTOS REALES: Solo D1 (Fatiga) y D3 (Distracción)
  if (distribution.d1 > 0) {
    partesEventos.push(`${distribution.d1} evento${distribution.d1 !== 1 ? "s" : ""} de Fatiga (D1)`)
  }

  if (distribution.d3 > 0) {
    partesEventos.push(`${distribution.d3} evento${distribution.d3 !== 1 ? "s" : ""} de Distracción (D3)`)
  }

  // FACTORES DE SEVERIDAD (agravantes, NO son eventos): Solo mencionar si existen
  if (factors.altaVelocidad > 0) {
    partesFactores.push(`${factors.altaVelocidad} evento${factors.altaVelocidad !== 1 ? "s" : ""} con velocidad ≥ 80 km/h`)
  }

  if (factors.reincidencia > 0) {
    partesFactores.push(`${factors.reincidencia} día${factors.reincidencia !== 1 ? "s" : ""} con reincidencia crítica`)
  }

  if (factors.franjaDominante) {
    partesFactores.push(`Franja horaria dominante: ${factors.franjaDominante}h (${factors.franjaCount} evento${factors.franjaCount !== 1 ? "s" : ""})`)
  }

  // Construir texto estructurado
  if (partesEventos.length === 0) {
    // Solo contar eventos D1/D3 reales
    const eventosReales = eventos.filter(
      (e) => e.evento?.trim() === "D1" || e.evento?.trim() === "D3"
    )
    if (eventosReales.length === 0) {
      return "No se registraron eventos críticos (D1 o D3) en el período analizado."
    }
    return `Se registraron ${eventosReales.length} evento${eventosReales.length !== 1 ? "s" : ""} crítico${eventosReales.length !== 1 ? "s" : ""} en el período analizado.`
  }

  // Construir texto con separación clara
  let texto = "Eventos críticos registrados: "
  texto += partesEventos.join(" y ") + "."

  if (partesFactores.length > 0) {
    texto += " Factores agravantes detectados: "
    texto += partesFactores.join(", ") + "."
  }

  return texto
}

export const SecurityAlertPdf: React.FC<SecurityAlertPdfProps> = ({
  allEventos,
  securityAlert,
  kpisEjecutivos,
}) => {
  const fechaActual = new Date()
  const fechaFormateada = formatFecha(fechaActual)
  const franjaMasRiesgosa = dominantTimeBand(allEventos)

  // Seleccionar el evento más grave
  const eventoMasGrave = seleccionarEventoMasGrave(allEventos)

  // Determinar si es alerta crítica basado en datos reales
  const esAlertaCritica =
    (eventoMasGrave && eventoMasGrave.evento?.trim() === "D1") ||
    securityAlert.severity === "CRITICAL"

  // Generar contexto preventivo basado únicamente en datos reales
  const contextoPreventivo = generarContextoPreventivo(
    allEventos,
    kpisEjecutivos.eventosFatiga,
    kpisEjecutivos.velocidadMaxima,
    franjaMasRiesgosa
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER - BLOQUE ROJO */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ALERTA DE SEGURIDAD VIAL</Text>
          <Text style={styles.headerDate}>Fecha del reporte: {fechaFormateada}</Text>
        </View>

        {/* BLOQUE PRINCIPAL - ALERTA */}
        <View style={styles.alertBlock}>
          <Text style={styles.alertText}>
            {esAlertaCritica ? "ALERTA CRÍTICA DE SEGURIDAD" : "EVENTO RELEVANTE DE SEGURIDAD VIAL"}
          </Text>

          {eventoMasGrave ? (
            <View>
              <Text style={styles.alertDetails}>
                El conductor {eventoMasGrave.operador || "N/A"} registró el evento '{obtenerDescripcionEvento(eventoMasGrave)}' el {formatFecha(eventoMasGrave.fecha)} a las {formatHora(eventoMasGrave.fecha)},
                conduciendo el vehículo {eventoMasGrave.vehiculo || "N/A"}.
              </Text>
              <Text style={styles.alertDetails}>
                Velocidad registrada al momento del evento: {eventoMasGrave.velocidad > 0 ? `${eventoMasGrave.velocidad} km/h` : "N/A"}.
              </Text>
              <Text style={styles.alertDetails}>
                Ubicación: {formatUbicacion(eventoMasGrave)}.
              </Text>
            </View>
          ) : (
            <Text style={styles.alertDetails}>
              Se registraron eventos críticos de seguridad vial (D1 y/o D3) en el período analizado.
            </Text>
          )}
        </View>

        {/* INDICADORES CLAVE */}
        <View style={styles.kpiSection}>
          <Text style={styles.kpiTitle}>INDICADORES CLAVE</Text>
          <View style={styles.kpiGrid}>
            {/* Eventos críticos */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{kpisEjecutivos.eventosCriticos}</Text>
              <Text style={styles.kpiLabel}>
                Eventos críticos{"\n"}
                <Text style={{ fontSize: 7, fontWeight: "normal" }}>
                  = D1 (Fatiga) + D3 (Distracción)
                </Text>
              </Text>
            </View>

            {/* Eventos de fatiga */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{kpisEjecutivos.eventosFatiga}</Text>
              <Text style={styles.kpiLabel}>Eventos de fatiga</Text>
            </View>

            {/* Velocidad máxima */}
            {kpisEjecutivos.velocidadMaxima > 0 && (
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{kpisEjecutivos.velocidadMaxima} km/h</Text>
                <Text style={styles.kpiLabel}>Velocidad máxima{"\n"}registrada</Text>
              </View>
            )}

            {/* Franja horaria más riesgosa */}
            {franjaMasRiesgosa && (
              <View style={styles.kpiCard}>
                <Text style={styles.kpiValue}>{franjaMasRiesgosa}h</Text>
                <Text style={styles.kpiLabel}>Franja más riesgosa</Text>
              </View>
            )}

            {/* Operadores únicos */}
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{kpisEjecutivos.operadoresUnicos}</Text>
              <Text style={styles.kpiLabel}>Operadores únicos</Text>
            </View>
          </View>
        </View>

        {/* DETALLE DEL EVENTO CRÍTICO */}
        {eventoMasGrave && (
          <View style={styles.detailSection}>
            <Text style={styles.detailTitle}>
              {esAlertaCritica ? "DETALLE DEL EVENTO CRÍTICO" : "DETALLE DEL EVENTO RELEVANTE"}
            </Text>
            <View style={styles.detailTable}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fecha y hora:</Text>
                <Text style={styles.detailValue}>{formatFechaHora(eventoMasGrave.fecha)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Evento:</Text>
                <Text style={styles.detailValue}>{obtenerDescripcionEvento(eventoMasGrave)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Operador:</Text>
                <Text style={styles.detailValue}>{eventoMasGrave.operador || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehículo:</Text>
                <Text style={styles.detailValue}>{eventoMasGrave.vehiculo || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Velocidad:</Text>
                <Text style={styles.detailValue}>
                  {eventoMasGrave.velocidad > 0 ? `${eventoMasGrave.velocidad} km/h (registrada al momento del evento)` : "N/A"}
                </Text>
              </View>
              <View style={styles.detailRowLast}>
                <Text style={styles.detailLabel}>Ubicación:</Text>
                <Text style={styles.detailValue}>{formatUbicacion(eventoMasGrave)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* CONTEXTO PREVENTIVO */}
        <View style={styles.contextBlock}>
          <Text style={styles.contextText}>
            {contextoPreventivo}
          </Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento preventivo generado por el sistema de monitoreo de seguridad vial
          </Text>
          <Text style={styles.footerText}>{fechaFormateada}</Text>
          <Text style={styles.footerPage}>Página 1 / 1</Text>
        </View>
      </Page>
    </Document>
  )
}
