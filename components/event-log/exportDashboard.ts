import { toPng } from "html-to-image"
import jsPDF from "jspdf"

/**
 * Exporta el dashboard como imagen PNG
 */
export async function exportDashboardPNG(containerId: string): Promise<void> {
  const element = document.getElementById(containerId)
  if (!element) {
    throw new Error(`No se encontró el contenedor con id: ${containerId}`)
  }

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#f8fafc",
      quality: 1,
    })

    // Crear link de descarga
    const link = document.createElement("a")
    link.download = `dashboard-seguridad-${new Date().toISOString().split("T")[0]}.png`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error("Error al exportar PNG:", error)
    throw error
  }
}

/**
 * Exporta el dashboard como PDF
 */
export async function exportDashboardPDF(containerId: string): Promise<void> {
  const element = document.getElementById(containerId)
  if (!element) {
    throw new Error(`No se encontró el contenedor con id: ${containerId}`)
  }

  try {
    // Generar PNG primero
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#f8fafc",
      quality: 1,
    })

    // Crear PDF en landscape (A4)
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    // Dimensiones de A4 landscape
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    // Obtener dimensiones de la imagen
    const img = new Image()
    img.src = dataUrl

    await new Promise((resolve) => {
      img.onload = () => {
        // Calcular escalado manteniendo aspect ratio
        const imgWidth = img.width
        const imgHeight = img.height
        const imgAspectRatio = imgWidth / imgHeight
        const pdfAspectRatio = pdfWidth / pdfHeight

        let finalWidth = pdfWidth
        let finalHeight = pdfHeight

        if (imgAspectRatio > pdfAspectRatio) {
          // Imagen más ancha que el PDF
          finalHeight = pdfWidth / imgAspectRatio
        } else {
          // Imagen más alta que el PDF
          finalWidth = pdfHeight * imgAspectRatio
        }

        // Centrar imagen
        const x = (pdfWidth - finalWidth) / 2
        const y = (pdfHeight - finalHeight) / 2

        // Agregar imagen al PDF
        pdf.addImage(dataUrl, "PNG", x, y, finalWidth, finalHeight)

        // Descargar PDF
        pdf.save(`dashboard-seguridad-${new Date().toISOString().split("T")[0]}.pdf`)
        resolve(null)
      }
    })
  } catch (error) {
    console.error("Error al exportar PDF:", error)
    throw error
  }
}
