"use client"

import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardIcon } from "./DashboardIcon"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  icon: LucideIcon
  iconColor?: "critical" | "warning" | "yellow" | "ok" | "info" | "gray"
  value: string | number
  title: string
  subtitle?: string
  className?: string
  highlight?: { label: string; tone?: "critical" | "warning" | "yellow" | "neutral" }
}

// Mapeo de colores semánticos para el icono decorativo con alpha translúcido
const decorativeIconColors = {
  critical: "rgba(252,165,165,0.45)", // red-300 con alpha
  warning: "rgba(253,186,116,0.45)", // orange-300 con alpha
  yellow: "rgba(253,224,71,0.45)", // yellow-300 con alpha
  ok: "rgba(134,239,172,0.45)", // green-300 con alpha
  info: "rgba(147,197,253,0.45)", // blue-300 con alpha
  gray: "rgba(203,213,225,0.45)", // slate-300 con alpha
}

// Mapeo de colores para el Badge highlight
const highlightColors = {
  critical: "bg-red-600 hover:bg-red-700 text-white border-red-700",
  warning: "bg-orange-600 hover:bg-orange-700 text-white border-orange-700",
  yellow: "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600",
  neutral: "bg-gray-600 hover:bg-gray-700 text-white border-gray-700",
}

export function KpiCard({
  icon: Icon,
  iconColor = "gray",
  value,
  title,
  subtitle,
  className,
  highlight,
}: KpiCardProps) {
  const decorativeColor = decorativeIconColors[iconColor]
  const highlightTone = highlight?.tone || "neutral"
  const highlightClassName = highlightColors[highlightTone]

  return (
    <Card
      className={cn(
        "p-6 bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl shadow-md border border-gray-200/60",
        "hover:shadow-xl hover:scale-[1.02]",
        "transition-all duration-200",
        "relative overflow-hidden",
        "min-h-[140px]",
        className
      )}
    >
      {/* Badge highlight en esquina superior derecha */}
      {highlight && (
        <div className="absolute top-4 right-4 z-20">
          <Badge className={cn("font-semibold text-xs px-2.5 py-1 border shadow-sm", highlightClassName)}>
            {highlight.label}
          </Badge>
        </div>
      )}

      {/* Icono pequeño funcional arriba izquierda */}
      <div className="absolute top-4 left-4 z-10">
        <DashboardIcon icon={Icon} color={iconColor} size="sm" />
      </div>

      {/* Icono grande decorativo de fondo (top-right) */}
      <div className="absolute right-[-60px] top-[0px] pointer-events-none z-0">
        <Icon
          className="h-[190px] w-[190px]"
          strokeWidth={1.8}
          style={{
            stroke: decorativeColor,
            filter: "blur(0.4px)",
            transform: "rotate(8deg)",
          }}
        />
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 pt-12">
        {/* Número KPI - Protagonista */}
        <div className="mb-3">
          <p className="text-6xl font-extrabold text-gray-900 leading-none tracking-tight drop-shadow-sm">
            {value}
          </p>
        </div>

        {/* Texto descriptivo */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
