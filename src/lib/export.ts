import { jsPDF } from 'jspdf'
import type { Cue } from '../types'
import { formatTimePrecise } from './time'

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportCuesCsv(cues: Cue[], projectName: string): void {
  const header = ['number', 'type', 'start', 'end', 'name', 'remark']
  const rows = cues.map((c) => [
    String(c.number),
    c.type,
    formatTimePrecise(c.start),
    c.end != null ? formatTimePrecise(c.end) : '',
    escapeCsv(c.name),
    escapeCsv(c.remark),
  ])

  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${sanitizeFileName(projectName)}-cues.csv`)
}

export async function exportCuesPdf(cues: Cue[], projectName: string): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(projectName || 'Cue List', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Exported ${new Date().toLocaleString()} · ${cues.length} cues`, margin, y)
  doc.setTextColor(0)
  y += 10

  for (const cue of cues) {
    const blockHeight = cue.thumbnail ? 42 : 28
    if (y + blockHeight > pageHeight - margin) {
      doc.addPage()
      y = margin
    }

    // Accent bar
    doc.setFillColor(cue.type === 'bullet' ? 230 : 200, cue.type === 'bullet' ? 140 : 120, 40)
    doc.rect(margin, y - 3, 2, blockHeight - 4, 'F')

    let textX = margin + 6

    if (cue.thumbnail) {
      try {
        doc.addImage(cue.thumbnail, 'JPEG', margin + 5, y - 2, 36, 24)
        textX = margin + 46
      } catch {
        // skip broken image
      }
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const timeLabel =
      cue.type === 'bullet' || cue.end == null
        ? formatTimePrecise(cue.start)
        : `${formatTimePrecise(cue.start)} – ${formatTimePrecise(cue.end)}`
    doc.text(`#${cue.number}  ${cue.type.toUpperCase()}  ${timeLabel}`, textX, y + 3)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const name = cue.name || '(unnamed)'
    doc.text(name, textX, y + 10)

    if (cue.remark) {
      doc.setFontSize(8)
      doc.setTextColor(80)
      const lines = doc.splitTextToSize(cue.remark, pageWidth - textX - margin)
      doc.text(lines.slice(0, 3), textX, y + 16)
      doc.setTextColor(0)
    }

    y += blockHeight
  }

  doc.save(`${sanitizeFileName(projectName)}-cues.pdf`)
}

function sanitizeFileName(name: string): string {
  return (name || 'cues').replace(/[^\w-]+/g, '_').slice(0, 60)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
