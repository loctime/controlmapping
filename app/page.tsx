import Link from "next/link"
import { ArrowRight, FileSpreadsheet, FileCheck } from "lucide-react"

export default function Home() {
  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 h-full">
        {/* Sección Mapping - Izquierda */}
        <Link
          href="/mapping"
          className="group relative flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-green-950/30 border-r-0 md:border-r border-border/50 cursor-pointer transition-all duration-500 hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-2xl hover:z-10 overflow-hidden"
        >
          {/* Patrón de fondo sutil */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.05] dark:group-hover:opacity-[0.08] transition-opacity duration-500">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Overlay de brillo en hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-100/0 via-emerald-100/0 to-green-100/0 dark:from-green-900/0 dark:via-emerald-900/0 dark:to-green-900/0 group-hover:from-green-100/25 group-hover:via-emerald-100/30 group-hover:to-green-100/25 dark:group-hover:from-green-900/15 dark:group-hover:via-emerald-900/20 dark:group-hover:to-green-900/15 transition-all duration-500 pointer-events-none" />
          
          {/* Contenido */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6 max-w-md w-full px-4">
            {/* Icono */}
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl group-hover:bg-green-500/35 group-hover:blur-2xl transition-all duration-500 scale-110" />
              <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 p-5 sm:p-6 rounded-2xl shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-500">
                <FileSpreadsheet className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
            </div>

            {/* Título y subtítulo */}
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
                Mapping
              </h1>
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-green-700 dark:text-green-400">
                Excel Mapper
              </h2>
            </div>

            {/* Descripción */}
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm">
              Mapea campos de Excel a esquemas estructurados con precisión visual
            </p>

            {/* Botón CTA */}
            <div className="pt-2 sm:pt-4">
              <div className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white rounded-lg font-semibold text-sm sm:text-base shadow-lg group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                <span>Empezar a mapear</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </div>

          {/* Indicador de esquina */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
        </Link>

        {/* Sección Process - Derecha */}
        <Link
          href="/process"
          className="group relative flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 dark:from-blue-950/30 dark:via-cyan-950/20 dark:to-blue-950/30 cursor-pointer transition-all duration-500 hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-2xl hover:z-10 overflow-hidden"
        >
          {/* Patrón de fondo sutil */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.05] dark:group-hover:opacity-[0.08] transition-opacity duration-500">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Overlay de brillo en hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/0 via-cyan-100/0 to-blue-100/0 dark:from-blue-900/0 dark:via-cyan-900/0 dark:to-blue-900/0 group-hover:from-blue-100/25 group-hover:via-cyan-100/30 group-hover:to-blue-100/25 dark:group-hover:from-blue-900/15 dark:group-hover:via-cyan-900/20 dark:group-hover:to-blue-900/15 transition-all duration-500 pointer-events-none" />
          
          {/* Contenido */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6 max-w-md w-full px-4">
            {/* Icono */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl group-hover:bg-blue-500/35 group-hover:blur-2xl transition-all duration-500 scale-110" />
              <div className="relative bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-600 dark:to-cyan-700 p-5 sm:p-6 rounded-2xl shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-500">
                <FileCheck className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
              </div>
            </div>

            {/* Título y subtítulo */}
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
                Process
              </h1>
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-blue-700 dark:text-blue-400">
                Excel Processor
              </h2>
            </div>

            {/* Descripción */}
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm">
              Procesa múltiples archivos Excel usando mapeos guardados y genera reportes
            </p>

            {/* Botón CTA */}
            <div className="pt-2 sm:pt-4">
              <div className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-700 dark:to-cyan-700 text-white rounded-lg font-semibold text-sm sm:text-base shadow-lg group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                <span>Procesar archivos</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </div>

          {/* Indicador de esquina */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse" />
          </div>
        </Link>
      </div>
    </div>
  )
}
