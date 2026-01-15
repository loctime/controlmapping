"use client"

import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SecurityAlert } from "./securityAlerts"
import { cn } from "@/lib/utils"

interface SecurityAlertBannerProps {
  alert: SecurityAlert
}

export function SecurityAlertBanner({ alert }: SecurityAlertBannerProps) {
  const severityConfig = getSeverityConfig(alert.severity)

  return (
    <Card
      className={cn(
        "p-4 rounded-lg shadow-sm border-2",
        severityConfig.bgColor,
        severityConfig.borderColor
      )}
    >
      <div className="flex items-start gap-4">
        {/* Ícono */}
        <div className={cn("flex-shrink-0", severityConfig.iconColor)}>
          {alert.severity === "OK" ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <AlertTriangle className="h-8 w-8" />
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {alert.severity === "OK" ? (
            <div className="space-y-1">
              <p className={cn("text-sm font-medium", severityConfig.textColor)}>
                {alert.message}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className={cn("text-base font-bold uppercase", severityConfig.titleColor)}>
                ALERTA {alert.severity === "CRITICAL" ? "CRÍTICA" : alert.severity === "HIGH" ? "ALTA" : "MEDIA"} DE SEGURIDAD
              </p>
              <p className={cn("text-sm", severityConfig.textColor)}>
                {alert.message}
              </p>
            </div>
          )}
        </div>

        {/* Badge de severidad */}
        {alert.severity !== "OK" && (
          <Badge
            className={cn(
              "flex-shrink-0 px-3 py-1 text-xs font-semibold uppercase",
              severityConfig.badgeBg,
              severityConfig.badgeText
            )}
          >
            {alert.severity === "CRITICAL"
              ? "CRÍTICA"
              : alert.severity === "HIGH"
              ? "ALTA"
              : "MEDIA"}
          </Badge>
        )}
      </div>
    </Card>
  )
}

function getSeverityConfig(severity: SecurityAlert["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return {
        bgColor: "bg-red-50 dark:bg-red-950/20",
        borderColor: "border-red-300 dark:border-red-800",
        iconColor: "text-red-600 dark:text-red-400",
        titleColor: "text-red-800 dark:text-red-300",
        textColor: "text-red-700 dark:text-red-200",
        badgeBg: "bg-red-600 hover:bg-red-700",
        badgeText: "text-white",
      }
    case "HIGH":
      return {
        bgColor: "bg-orange-50 dark:bg-orange-950/20",
        borderColor: "border-orange-300 dark:border-orange-800",
        iconColor: "text-orange-600 dark:text-orange-400",
        titleColor: "text-orange-800 dark:text-orange-300",
        textColor: "text-orange-700 dark:text-orange-200",
        badgeBg: "bg-orange-600 hover:bg-orange-700",
        badgeText: "text-white",
      }
    case "MEDIUM":
      return {
        bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
        borderColor: "border-yellow-300 dark:border-yellow-800",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        titleColor: "text-yellow-800 dark:text-yellow-300",
        textColor: "text-yellow-700 dark:text-yellow-200",
        badgeBg: "bg-yellow-600 hover:bg-yellow-700",
        badgeText: "text-white",
      }
    case "OK":
      return {
        bgColor: "bg-green-50 dark:bg-green-950/20",
        borderColor: "border-green-300 dark:border-green-800",
        iconColor: "text-green-600 dark:text-green-400",
        titleColor: "text-green-800 dark:text-green-300",
        textColor: "text-green-700 dark:text-green-200",
        badgeBg: "bg-green-600 hover:bg-green-700",
        badgeText: "text-white",
      }
  }
}
