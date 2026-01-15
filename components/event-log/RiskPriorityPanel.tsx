"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, Car } from "lucide-react"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import {
  computeOperatorRiskProfiles,
  computeVehicleRiskProfiles,
  type RiskLevel,
} from "./riskModel"

interface RiskPriorityPanelProps {
  eventos: VehiculoEvento[]
}

function getRiskBadgeVariant(level: RiskLevel): "destructive" | "default" | "secondary" {
  switch (level) {
    case "HIGH":
      return "destructive"
    case "MEDIUM":
      return "default"
    case "LOW":
      return "secondary"
  }
}

function getRiskBadgeClassName(level: RiskLevel): string {
  switch (level) {
    case "HIGH":
      return "bg-red-500 text-white border-red-600"
    case "MEDIUM":
      return "bg-yellow-500 text-white border-yellow-600"
    case "LOW":
      return "bg-green-500 text-white border-green-600"
  }
}

export function RiskPriorityPanel({ eventos }: RiskPriorityPanelProps) {
  // Calcular rankings usando el nuevo modelo
  const operadoresRanking = useMemo(() => {
    return computeOperatorRiskProfiles(eventos)
  }, [eventos])

  const vehiculosRanking = useMemo(() => {
    return computeVehicleRiskProfiles(eventos)
  }, [eventos])

  // Filtrar top 3 operadores críticos (score HIGH > 50)
  const operadoresCriticos = useMemo(() => {
    return operadoresRanking
      .filter((op) => op.score.level === "HIGH" && op.score.score > 50)
      .slice(0, 3)
  }, [operadoresRanking])

  // Filtrar top 3 vehículos críticos (score HIGH > 50)
  const vehiculosCriticos = useMemo(() => {
    return vehiculosRanking
      .filter((veh) => veh.score.level === "HIGH" && veh.score.score > 50)
      .slice(0, 3)
  }, [vehiculosRanking])

  const tieneOperadoresCriticos = operadoresCriticos.length > 0
  const tieneVehiculosCriticos = vehiculosCriticos.length > 0

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Título del panel */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="text-lg font-semibold">Prioridades de Intervención</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sección A: Operadores Críticos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-base font-semibold">Operadores Críticos</h4>
            </div>

            {tieneOperadoresCriticos ? (
              <div className="space-y-3">
                {operadoresCriticos.map((operador, index) => (
                  <Card
                    key={operador.operador}
                    className="p-4 border-l-4 border-l-destructive bg-destructive/5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-muted-foreground">
                              #{index + 1}
                            </span>
                            <span className="font-semibold">{operador.operador}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className={getRiskBadgeClassName(operador.score.level)}
                              variant={getRiskBadgeVariant(operador.score.level)}
                            >
                              {operador.score.level}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Score: <span className="font-mono font-semibold">{operador.score.score.toFixed(1)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Fatiga (D1):</span>
                          <span className="font-semibold text-red-600">
                            {operador.distribution.d1 > 0 ? operador.distribution.d1.toLocaleString() : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Distracción (D3):</span>
                          <span className="font-semibold text-orange-600">
                            {operador.distribution.d3 > 0 ? operador.distribution.d3.toLocaleString() : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Total eventos:</span>
                          <span className="font-semibold">
                            {operador.totalEventos.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  No se detectan operadores críticos en el período
                </p>
              </Card>
            )}
          </div>

          {/* Sección B: Vehículos Críticos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-base font-semibold">Vehículos Críticos</h4>
            </div>

            {tieneVehiculosCriticos ? (
              <div className="space-y-3">
                {vehiculosCriticos.map((vehiculo, index) => (
                  <Card
                    key={vehiculo.vehiculo}
                    className="p-4 border-l-4 border-l-destructive bg-destructive/5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-muted-foreground">
                              #{index + 1}
                            </span>
                            <span className="font-semibold">{vehiculo.vehiculo}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className={getRiskBadgeClassName(vehiculo.score.level)}
                              variant={getRiskBadgeVariant(vehiculo.score.level)}
                            >
                              {vehiculo.score.level}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Score: <span className="font-mono font-semibold">{vehiculo.score.score.toFixed(1)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Fatiga (D1):</span>
                          <span className="font-semibold text-red-600">
                            {vehiculo.distribution.d1 > 0 ? vehiculo.distribution.d1.toLocaleString() : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Distracción (D3):</span>
                          <span className="font-semibold text-orange-600">
                            {vehiculo.distribution.d3 > 0 ? vehiculo.distribution.d3.toLocaleString() : "-"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Total eventos:</span>
                          <span className="font-semibold">
                            {vehiculo.totalEventos.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  No se detectan vehículos críticos en el período
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
