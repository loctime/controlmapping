"use client"

import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardIconProps {
  icon: LucideIcon
  color?: "critical" | "warning" | "yellow" | "ok" | "info" | "gray"
  size?: "sm" | "md" | "lg"
  animate?: boolean
  className?: string
}

const colorConfig = {
  critical: {
    bg: "bg-red-100",
    icon: "text-red-600",
  },
  warning: {
    bg: "bg-orange-100",
    icon: "text-orange-600",
  },
  yellow: {
    bg: "bg-yellow-100",
    icon: "text-yellow-600",
  },
  ok: {
    bg: "bg-green-100",
    icon: "text-green-600",
  },
  info: {
    bg: "bg-blue-100",
    icon: "text-blue-600",
  },
  gray: {
    bg: "bg-gray-100",
    icon: "text-gray-600",
  },
}

const sizeConfig = {
  sm: {
    container: "w-10 h-10",
    icon: "h-5 w-5",
  },
  md: {
    container: "w-12 h-12",
    icon: "h-6 w-6",
  },
  lg: {
    container: "w-16 h-16",
    icon: "h-10 w-10",
  },
}

export function DashboardIcon({
  icon: Icon,
  color = "gray",
  size = "md",
  animate = false,
  className,
}: DashboardIconProps) {
  const colors = colorConfig[color]
  const sizes = sizeConfig[size]

  const iconContainer = (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shadow-sm",
        colors.bg,
        sizes.container,
        className
      )}
    >
      <Icon className={cn(colors.icon, sizes.icon)} strokeWidth={2.5} />
    </div>
  )

  if (animate) {
    return (
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {iconContainer}
      </motion.div>
    )
  }

  return iconContainer
}
