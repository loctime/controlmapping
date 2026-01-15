"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import {
  computeOperatorRiskProfiles,
  computeVehicleRiskProfiles,
} from "./riskModel"

interface RiskDriversPanelProps {
  eventos: VehiculoEvento[]
}

export function RiskDriversPanel({ eventos }: RiskDriversPanelProps) {
  // Calcular perfiles de riesgo usando el nuevo modelo
  const operadoresProfiles = useMemo(() => {
    return computeOperatorRiskProfiles(eventos)
  }, [eventos])

  const vehiculosProfiles = useMemo(() => {
    return computeVehicleRiskProfiles(eventos)
  }, [eventos])

  // Filtrar solo los HIGH
  const operadoresHigh = useMemo(() => {
    return operadoresProfiles.filter((op) => op.score.level === "HIGH")
  }, [operadoresProfiles])

  const vehiculosHigh = useMemo(() => {
    return vehiculosProfiles.filter((veh) => veh.score.level === "HIGH")
  }, [vehiculosProfiles])

  const tieneOperadoresHigh = operadoresHigh.length > 0
  const tieneVehiculosHigh = vehiculosHigh.length > 0

  if (!tieneOperadoresHigh && !tieneVehiculosHigh) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Factores de Riesgo Dominantes</h3>
          <p className="text-sm text-muted-foreground">
            No se detectan factores de riesgo dominantes en el período
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Título del panel */}
        <div>
          <h3 className="text-lg font-semibold">Factores de Riesgo Dominantes</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Desglose de los factores que contribuyen al score de riesgo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sección: Operadores HIGH */}
          {tieneOperadoresHigh && (
            <div className="space-y-4">
              <h4 className="text-base font-semibold">Operadores de Alto Riesgo</h4>
              <div className="space-y-4">
                {operadoresHigh.map((operador) => (
                  <Card key={operador.operador} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-semibold">{operador.operador}</h5>
                        <p className="text-xs text-muted-foreground">
                          Score: {operador.score.score.toFixed(1)} ({operador.score.level}) • {operador.totalEventos} evento{operador.totalEventos !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Distribución de eventos (D1 y D3) */}
                      <div className="space-y-2">
                        {/* Fatiga (D1) */}
                        {operador.distribution.pctFatiga > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Fatiga</span>
                              <span className="font-medium text-red-600">
                                {operador.distribution.pctFatiga.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-red-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 rounded-full transition-all"
                                style={{ width: `${operador.distribution.pctFatiga}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Distracción (D3) */}
                        {operador.distribution.pctDistraccion > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Distracción</span>
                              <span className="font-medium text-orange-600">
                                {operador.distribution.pctDistraccion.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-orange-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all"
                                style={{ width: `${operador.distribution.pctDistraccion}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Factores de riesgo */}
                      {(operador.factors.altaVelocidad > 0 ||
                        operador.factors.reincidencia > 0 ||
                        operador.factors.franjaDominante) && (
                        <div className="pt-2 border-t border-border/50 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Factores de riesgo:</p>
                          {operador.factors.altaVelocidad > 0 && (
                            <p className="text-xs text-muted-foreground">
                              • Alta velocidad: {operador.factors.altaVelocidad} evento{operador.factors.altaVelocidad !== 1 ? "s" : ""}
                            </p>
                          )}
                          {operador.factors.reincidencia > 0 && (
                            <p className="text-xs text-muted-foreground">
                              • Reincidencia: {operador.factors.reincidencia} día{operador.factors.reincidencia !== 1 ? "s" : ""} crítico{operador.factors.reincidencia !== 1 ? "s" : ""}
                            </p>
                          )}
                          {operador.factors.franjaDominante && (
                            <p className="text-xs text-muted-foreground">
                              • Franja dominante: {operador.factors.franjaDominante}h ({operador.factors.franjaCount} evento{operador.factors.franjaCount !== 1 ? "s" : ""})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sección: Vehículos HIGH */}
          {tieneVehiculosHigh && (
            <div className="space-y-4">
              <h4 className="text-base font-semibold">Vehículos de Alto Riesgo</h4>
              <div className="space-y-4">
                {vehiculosHigh.map((vehiculo) => (
                  <Card key={vehiculo.vehiculo} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-semibold">{vehiculo.vehiculo}</h5>
                        <p className="text-xs text-muted-foreground">
                          Score: {vehiculo.score.score.toFixed(1)} ({vehiculo.score.level}) • {vehiculo.totalEventos} evento{vehiculo.totalEventos !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Distribución de eventos (D1 y D3) */}
                      <div className="space-y-2">
                        {/* Fatiga (D1) */}
                        {vehiculo.distribution.pctFatiga > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Fatiga</span>
                              <span className="font-medium text-red-600">
                                {vehiculo.distribution.pctFatiga.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-red-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 rounded-full transition-all"
                                style={{ width: `${vehiculo.distribution.pctFatiga}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Distracción (D3) */}
                        {vehiculo.distribution.pctDistraccion > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Distracción</span>
                              <span className="font-medium text-orange-600">
                                {vehiculo.distribution.pctDistraccion.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-orange-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all"
                                style={{ width: `${vehiculo.distribution.pctDistraccion}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Factores de riesgo */}
                      {(vehiculo.factors.altaVelocidad > 0 ||
                        vehiculo.factors.reincidencia > 0 ||
                        vehiculo.factors.franjaDominante) && (
                        <div className="pt-2 border-t border-border/50 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Factores de riesgo:</p>
                          {vehiculo.factors.altaVelocidad > 0 && (
                            <p className="text-xs text-muted-foreground">
                              • Alta velocidad: {vehiculo.factors.altaVelocidad} evento{vehiculo.factors.altaVelocidad !== 1 ? "s" : ""}
                            </p>
                          )}
                          {vehiculo.factors.reincidencia > 0 && (
                            <p className="text-xs text-muted-foreground">
                              • Reincidencia: {vehiculo.factors.reincidencia} día{vehiculo.factors.reincidencia !== 1 ? "s" : ""} crítico{vehiculo.factors.reincidencia !== 1 ? "s" : ""}
                            </p>
                          )}
                          {vehiculo.factors.franjaDominante && (
                            <p className="text-xs text-muted-foreground">
                              • Franja dominante: {vehiculo.factors.franjaDominante}h ({vehiculo.factors.franjaCount} evento{vehiculo.factors.franjaCount !== 1 ? "s" : ""})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
