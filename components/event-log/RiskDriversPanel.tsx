"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import {
  calculateRiskScoreByOperator,
  calculateRiskScoreByVehicle,
  calculateRiskDriversByOperator,
  calculateRiskDriversByVehicle,
} from "./riskScoring"

interface RiskDriversPanelProps {
  eventos: VehiculoEvento[]
}

export function RiskDriversPanel({ eventos }: RiskDriversPanelProps) {
  // Calcular scores y drivers usando las funciones existentes
  const operadoresScores = useMemo(() => {
    return calculateRiskScoreByOperator(eventos)
  }, [eventos])

  const vehiculosScores = useMemo(() => {
    return calculateRiskScoreByVehicle(eventos)
  }, [eventos])

  const operadoresDrivers = useMemo(() => {
    return calculateRiskDriversByOperator(eventos)
  }, [eventos])

  const vehiculosDrivers = useMemo(() => {
    return calculateRiskDriversByVehicle(eventos)
  }, [eventos])

  // Filtrar solo los HIGH y combinar con sus drivers
  const operadoresHigh = useMemo(() => {
    return operadoresScores
      .filter((op) => op.level === "HIGH")
      .map((op) => {
        const drivers = operadoresDrivers.find((d) => d.operador === op.operador)
        return {
          ...op,
          drivers: drivers?.drivers || { fatigaPct: 0, velocidadPct: 0, reincidenciaPct: 0 },
        }
      })
  }, [operadoresScores, operadoresDrivers])

  const vehiculosHigh = useMemo(() => {
    return vehiculosScores
      .filter((veh) => veh.level === "HIGH")
      .map((veh) => {
        const drivers = vehiculosDrivers.find((d) => d.vehiculo === veh.vehiculo)
        return {
          ...veh,
          drivers: drivers?.drivers || { fatigaPct: 0, velocidadPct: 0, reincidenciaPct: 0 },
        }
      })
  }, [vehiculosScores, vehiculosDrivers])

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
                          Score: {operador.score.toFixed(1)} • {operador.totalEventos} evento{operador.totalEventos !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Barras de progreso apiladas */}
                      <div className="space-y-2">
                        {/* Fatiga */}
                        {operador.drivers.fatigaPct > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Fatiga</span>
                              <span className="font-medium text-red-600">
                                {operador.drivers.fatigaPct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-red-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 rounded-full transition-all"
                                style={{ width: `${operador.drivers.fatigaPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Velocidad */}
                        {operador.drivers.velocidadPct > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Velocidad</span>
                              <span className="font-medium text-orange-600">
                                {operador.drivers.velocidadPct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-orange-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all"
                                style={{ width: `${operador.drivers.velocidadPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Reincidencia */}
                        {operador.drivers.reincidenciaPct > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Reincidencia</span>
                              <span className="font-medium text-yellow-600">
                                {operador.drivers.reincidenciaPct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-yellow-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500 rounded-full transition-all"
                                style={{ width: `${operador.drivers.reincidenciaPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
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
                          Score: {vehiculo.score.toFixed(1)} • {vehiculo.totalEventos} evento{vehiculo.totalEventos !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Barras de progreso apiladas */}
                      <div className="space-y-2">
                        {/* Fatiga */}
                        {vehiculo.drivers.fatigaPct > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Fatiga</span>
                              <span className="font-medium text-red-600">
                                {vehiculo.drivers.fatigaPct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-red-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500 rounded-full transition-all"
                                style={{ width: `${vehiculo.drivers.fatigaPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Velocidad */}
                        {vehiculo.drivers.velocidadPct > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Velocidad</span>
                              <span className="font-medium text-orange-600">
                                {vehiculo.drivers.velocidadPct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-orange-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all"
                                style={{ width: `${vehiculo.drivers.velocidadPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Reincidencia */}
                        {vehiculo.drivers.reincidenciaPct > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Reincidencia</span>
                              <span className="font-medium text-yellow-600">
                                {vehiculo.drivers.reincidenciaPct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-yellow-50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500 rounded-full transition-all"
                                style={{ width: `${vehiculo.drivers.reincidenciaPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
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
