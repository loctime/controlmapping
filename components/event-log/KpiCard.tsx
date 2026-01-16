"use client"

import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { DashboardIcon } from "./DashboardIcon"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  icon: LucideIcon
  iconColor?: "critical" | "warning" | "yellow" | "ok" | "info" | "gray"
  value: string | number
  title: string
  subtitle?: string
  className?: string
}

// Mapeo de colores semánticos para el icono decorativo
const decorativeIconColors = {
  critical: "text-red-500",
  warning: "text-orange-500",
  yellow: "text-yellow-500",
  ok: "text-green-500",
  info: "text-blue-500",
  gray: "text-gray-400",
}

export function KpiCard({
  icon: Icon,
  iconColor = "gray",
  value,
  title,
  subtitle,
  className,
}: KpiCardProps) {
  const decorativeColor = decorativeIconColors[iconColor]

  return (
    <Card
      className={cn(
        "p-6 bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl shadow-md border-0",
        "hover:shadow-2xl hover:scale-[1.02]",
        "transition-all duration-200",
        "relative overflow-hidden",
        "min-h-[140px]",
        className
      )}
    >
      {/* Icono pequeño funcional arriba izquierda */}
      <div className="absolute top-4 left-4 z-10">
        <DashboardIcon icon={Icon} color={iconColor} size="sm" />
      </div>

      {/* Icono grande decorativo de fondo (top-right) */}
      <div className="absolute right-[-20px] top-[10px] opacity-[0.18] pointer-events-none z-0">
        <Icon className={cn("h-40 w-40", decorativeColor)} strokeWidth={1} />
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
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
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
