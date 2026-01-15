"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { VehiculoEvento } from "@/domains/vehiculo/types"
import { calculateRiskScoreByVehicle, type RiskLevel } from "./riskScoring"

interface RiskRankingVehiclesProps {
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

export function RiskRankingVehicles({ eventos }: RiskRankingVehiclesProps) {
  const rankings = useMemo(() => {
    return calculateRiskScoreByVehicle(eventos)
  }, [eventos])

  if (rankings.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Ranking de Riesgo por Vehículo</h3>
          <p className="text-sm text-muted-foreground">
            No hay datos suficientes para calcular el ranking de riesgo
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Ranking de Riesgo por Vehículo</h3>
          <p className="text-sm text-muted-foreground">
            Vehículos ordenados por nivel de riesgo (mayor a menor)
          </p>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Nivel</TableHead>
                <TableHead className="text-center">Total Eventos</TableHead>
                <TableHead className="text-center">Eventos Fatiga</TableHead>
                <TableHead className="text-center">Eventos Críticos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((ranking, index) => (
                <TableRow key={ranking.vehiculo}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{ranking.vehiculo}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono font-semibold">{ranking.score.toFixed(1)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={getRiskBadgeClassName(ranking.level)}
                      variant={getRiskBadgeVariant(ranking.level)}
                    >
                      {ranking.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {ranking.totalEventos.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {ranking.eventosFatiga > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {ranking.eventosFatiga.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {ranking.eventosCriticos > 0 ? (
                      <span className="text-destructive font-medium">
                        {ranking.eventosCriticos.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  )
}
