import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { VehiculoEventosFile, VehiculoEvento } from "@/domains/vehiculo/types"
import type { SecurityAlert } from "./securityAlerts"
import {
  calculateRiskScoreByOperator,
  calculateRiskScoreByVehicle,
} from "./riskScoring"

interface ExecutiveOnePagerViewProps {
  data: VehiculoEventosFile[]
  securityAlert: SecurityAlert
}

// Estilos optimizados para una sola página ultra visual
const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 8,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    flexDirection: "column",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#1f2937",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
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
  // Alerta crítica
  alertBlock: {
    backgroundColor: "#fef2f2",
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
    padding: 8,
    marginBottom: 10,
    borderRadius: 2,
  },
  alertText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#991b1b",
  },
  // KPIs Grid
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
    gap: 6,
  },
  kpiCard: {
    width: "23.5%",
    padding: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 6,
    color: "#6b7280",
    marginBottom: 3,
    textAlign: "center",
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  kpiSubtext: {
    fontSize: 6,
    color: "#9ca3af",
    marginTop: 2,
  },
  // Gráficos
  chartsRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
  },
  chartContainer: {
    flex: 1,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  chartTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 6,
    textAlign: "center",
  },
  donutContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 70,
    position: "relative",
  },
  donutCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 10,
    borderColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  donutText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1f2937",
  },
  donutLabel: {
    fontSize: 6,
    color: "#6b7280",
    marginTop: 3,
  },
  donutLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    gap: 8,
  },
  donutLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  donutLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  donutLegendText: {
    fontSize: 6,
    color: "#6b7280",
  },
  barChart: {
    height: 70,
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 3,
  },
  barWrapper: {
    height: 70,
    width: 14,
    justifyContent: "flex-end",
    backgroundColor: "#f3f4f6",
    borderRadius: 2,
  },
  bar: {
    width: 14,
    backgroundColor: "#3b82f6",
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 5,
    color: "#6b7280",
    marginTop: 3,
    textAlign: "center",
  },
  barValue: {
    fontSize: 6,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 2,
    textAlign: "center",
  },
  // Prioridades
  prioritiesRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
  },
  priorityColumn: {
    flex: 1,
  },
  priorityTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  priorityItem: {
    padding: 5,
    marginBottom: 3,
    backgroundColor: "#fef2f2",
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
    borderRadius: 2,
  },
  priorityName: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2,
  },
  priorityScore: {
    fontSize: 6,
    color: "#6b7280",
  },
  priorityItemOK: {
    padding: 5,
    marginBottom: 3,
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e",
    borderRadius: 2,
  },
  priorityNameOK: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#15803d",
  },
  // Footer
  footer: {
    marginTop: "auto",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  conclusion: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    fontStyle: "italic",
  },
})

function getBadgeStyle(severity: SecurityAlert["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return styles.badgeCritical
    case "HIGH":
      return styles.badgeHigh
    case "MEDIUM":
      return styles.badgeMedium
    case "OK":
      return styles.badgeOK
  }
}

function getBadgeLabel(severity: SecurityAlert["severity"]): string {
  switch (severity) {
    case "CRITICAL":
      return "CRÍTICO"
    case "HIGH":
      return "ATENCIÓN"
    case "MEDIUM":
      return "ATENCIÓN"
    case "OK":
      return "OK"
  }
}

function getPeriodTitle(data: VehiculoEventosFile[]): string {
  if (data.length === 0) return "Período no especificado"
  
  const allEventos = data.flatMap((file) => file.eventos)
  if (allEventos.length === 0) return "Período sin eventos"
  
  const fechas = allEventos.map((e) => e.fecha.getTime())
  const fechaMin = new Date(Math.min(...fechas))
  const fechaMax = new Date(Math.max(...fechas))
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }
  
  if (fechaMin.toDateString() === fechaMax.toDateString()) {
    return `Reporte del ${formatDate(fechaMin)}`
  }
  
  return `${formatDate(fechaMin)} - ${formatDate(fechaMax)}`
}

function generateConclusion(
  totalEventos: number,
  porcentajeFatiga: number,
  securityAlert: SecurityAlert,
  topOperadores: ReturnType<typeof calculateRiskScoreByOperator>,
  topVehiculos: ReturnType<typeof calculateRiskScoreByVehicle>
): string {
  const partes: string[] = []
  
  if (securityAlert.severity === "CRITICAL") {
    partes.push("ALERTA CRÍTICA")
  } else if (securityAlert.severity === "HIGH") {
    partes.push("Requiere atención inmediata")
  }
  
  if (porcentajeFatiga > 50) {
    partes.push(`fatiga dominante (${porcentajeFatiga}%)`)
  }
  
  if (topOperadores.length > 0 || topVehiculos.length > 0) {
    const criticos = []
    if (topOperadores.length > 0) criticos.push(`${topOperadores.length} operador${topOperadores.length > 1 ? "es" : ""}`)
    if (topVehiculos.length > 0) criticos.push(`${topVehiculos.length} vehículo${topVehiculos.length > 1 ? "s" : ""}`)
    partes.push(`prioridad: ${criticos.join(" y ")}`)
  }
  
  if (partes.length === 0) {
    return "Estado operativo dentro de parámetros normales."
  }
  
  return partes.join(" • ").toUpperCase() + "."
}

export const ExecutiveOnePagerView: React.FC<ExecutiveOnePagerViewProps> = ({
  data,
  securityAlert,
}) => {
  const allEventos = data.flatMap((file) => file.eventos)
  
  // Calcular KPIs
  const totalEventos = allEventos.length
  const eventosFatiga = allEventos.filter((e) => e.evento?.trim() === "D1").length
  const eventosDistraccion = allEventos.filter((e) => e.evento?.trim() === "D3").length
  const porcentajeFatiga = totalEventos > 0 ? Math.round((eventosFatiga / totalEventos) * 100) : 0
  const porcentajeDistraccion = totalEventos > 0 ? Math.round((eventosDistraccion / totalEventos) * 100) : 0
  
  const operadoresUnicos = new Set(
    allEventos.map((e) => e.operador?.trim()).filter((o) => o && o !== "")
  ).size
  
  const velocidades = allEventos.map((e) => e.velocidad).filter((v) => v > 0)
  const velocidadMaxima = velocidades.length > 0 ? Math.max(...velocidades) : 0
  
  // Eventos por franja horaria
  const eventosPorFranja: Record<string, number> = {
    "00-06": 0,
    "06-12": 0,
    "12-18": 0,
    "18-24": 0,
  }
  
  allEventos.forEach((evento) => {
    const hora = evento.fecha.getHours()
    if (hora >= 0 && hora < 6) eventosPorFranja["00-06"]++
    else if (hora >= 6 && hora < 12) eventosPorFranja["06-12"]++
    else if (hora >= 12 && hora < 18) eventosPorFranja["12-18"]++
    else if (hora >= 18 && hora < 24) eventosPorFranja["18-24"]++
  })
  
  const maxFranja = Math.max(...Object.values(eventosPorFranja))
  
  // Top operadores y vehículos críticos
  const operadoresScores = calculateRiskScoreByOperator(allEventos)
  const vehiculosScores = calculateRiskScoreByVehicle(allEventos)
  
  const topOperadores = operadoresScores
    .filter((op) => op.level === "HIGH" && op.score > 50)
    .slice(0, 3)
  
  const topVehiculos = vehiculosScores
    .filter((veh) => veh.level === "HIGH" && veh.score > 50)
    .slice(0, 3)
  
  // Generar conclusión
  const conclusion = generateConclusion(
    totalEventos,
    porcentajeFatiga,
    securityAlert,
    topOperadores,
    topVehiculos
  )
  
  const periodTitle = getPeriodTitle(data)
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{periodTitle}</Text>
          <View style={[styles.badge, getBadgeStyle(securityAlert.severity)]}>
            <Text>{getBadgeLabel(securityAlert.severity)}</Text>
          </View>
        </View>
        
        {/* Alerta crítica (solo si existe) */}
        {securityAlert.severity === "CRITICAL" && (
          <View style={styles.alertBlock}>
            <Text style={styles.alertText}>{securityAlert.message}</Text>
          </View>
        )}
        
        {/* KPIs Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Eventos Totales</Text>
            <Text style={styles.kpiValue}>{totalEventos.toLocaleString()}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>% Fatiga</Text>
            <Text style={styles.kpiValue}>{porcentajeFatiga}%</Text>
            <Text style={styles.kpiSubtext}>{eventosFatiga} eventos</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Operadores Afectados</Text>
            <Text style={styles.kpiValue}>{operadoresUnicos}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Velocidad Máxima</Text>
            <Text style={styles.kpiValue}>
              {velocidadMaxima > 0 ? `${velocidadMaxima}` : "-"}
            </Text>
            <Text style={styles.kpiSubtext}>km/h</Text>
          </View>
        </View>
        
        {/* Gráficos */}
        <View style={styles.chartsRow}>
          {/* Donut: Fatiga vs Distracción */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Fatiga vs Distracción</Text>
            <View style={styles.donutContainer}>
              <View
                style={[
                  styles.donutCircle,
                  {
                    borderColor: porcentajeFatiga > porcentajeDistraccion ? "#dc2626" : "#ea580c",
                  },
                ]}
              >
                <Text style={styles.donutText}>
                  {totalEventos > 0
                    ? `${Math.round((eventosFatiga / totalEventos) * 100)}%`
                    : "0%"}
                </Text>
                <Text style={[styles.donutLabel, { fontSize: 5, marginTop: 1 }]}>Fatiga</Text>
              </View>
              <View style={styles.donutLegend}>
                <View style={styles.donutLegendItem}>
                  <View style={[styles.donutLegendDot, { backgroundColor: "#dc2626" }]} />
                  <Text style={styles.donutLegendText}>Fatiga {porcentajeFatiga}%</Text>
                </View>
                <View style={styles.donutLegendItem}>
                  <View style={[styles.donutLegendDot, { backgroundColor: "#ea580c" }]} />
                  <Text style={styles.donutLegendText}>Distracción {porcentajeDistraccion}%</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Barras: Eventos por franja horaria */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Eventos por Franja Horaria</Text>
            <View style={styles.barChart}>
              {Object.entries(eventosPorFranja).map(([franja, cantidad]) => (
                <View key={franja} style={{ alignItems: "center" }}>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: maxFranja > 0 ? (cantidad / maxFranja) * 70 : 0,
                          backgroundColor: cantidad === maxFranja ? "#dc2626" : "#3b82f6",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{cantidad}</Text>
                  <Text style={styles.barLabel}>{franja}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        
        {/* Prioridades de Acción */}
        <View style={styles.prioritiesRow}>
          {/* Top Operadores */}
          <View style={styles.priorityColumn}>
            <Text style={styles.priorityTitle}>Operadores Críticos</Text>
            {topOperadores.length > 0 ? (
              topOperadores.map((op, idx) => (
                <View key={op.operador} style={styles.priorityItem}>
                  <Text style={styles.priorityName}>
                    #{idx + 1} {op.operador}
                  </Text>
                  <Text style={styles.priorityScore}>
                    Score: {op.score.toFixed(1)} • {op.totalEventos} eventos
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.priorityItemOK}>
                <Text style={styles.priorityNameOK}>
                  Sin operadores críticos
                </Text>
              </View>
            )}
          </View>
          
          {/* Top Vehículos */}
          <View style={styles.priorityColumn}>
            <Text style={styles.priorityTitle}>Vehículos Críticos</Text>
            {topVehiculos.length > 0 ? (
              topVehiculos.map((veh, idx) => (
                <View key={veh.vehiculo} style={styles.priorityItem}>
                  <Text style={styles.priorityName}>
                    #{idx + 1} {veh.vehiculo}
                  </Text>
                  <Text style={styles.priorityScore}>
                    Score: {veh.score.toFixed(1)} • {veh.totalEventos} eventos
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.priorityItemOK}>
                <Text style={styles.priorityNameOK}>
                  Sin vehículos críticos
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Footer con conclusión */}
        <View style={styles.footer}>
          <Text style={styles.conclusion}>{conclusion}</Text>
        </View>
      </Page>
    </Document>
  )
}
