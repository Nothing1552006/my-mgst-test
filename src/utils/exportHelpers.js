import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

export function exportCSV(sessions) {
  const rows = sessions.map((s, i) => ({
    'No': i + 1,
    'Date': s.date,
    'Time': s.time || '-',
    'Name': s.name,
    'Age': s.age,
    'Sport': s.sport,
    'Dominant Eye': s.dominantEye || '-',
    'Baseline SVA': s.sva,
    'Clinical Notes': s.notes || '-',
    'GST Score': s.hScore,
    'GST Accuracy %': s.hAccuracy,
    'GST Status': s.hStatus,
    'Avg RT (ms)': s.hAvgReactionTime || '-',
    'Avg Clarity Grade': s.hAvgClarityGrade ?? '-',
    'Avg Head Speed (°/s)': s.hHeadMovement?.avgSpeed ?? '-',
    'Peak Head Speed (°/s)': s.hHeadMovement?.peakSpeed ?? '-',
    'Total Swings': s.hHeadMovement?.totalSwings ?? '-',
    'GST Classification': s.hHeadMovement?.avgSpeed >= 120 ? 'Normal GST' :
      s.hHeadMovement?.avgSpeed < 80 ? 'Abnormal GST' :
      s.hHeadMovement?.avgSpeed ? 'Borderline' : '-',
    'Trial 1': s.hTrialScores?.[0] ?? '-',
    'Trial 2': s.hTrialScores?.[1] ?? '-',
    'Trial 3': s.hTrialScores?.[2] ?? '-',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  const colWidths = [
    { wch: 4 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
    { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    { wch: 12 }, { wch: 16 },
    { wch: 10 }, { wch: 10 }, { wch: 10 },
  ]
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MGST Results')
  XLSX.writeFile(
    workbook,
    `MGST_Results_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.xlsx`
  )
}

export function exportPDF(sessions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 16
  let y = margin

  const getRTLabel = (ms) => {
    if (!ms || ms === 0) return '-'
    if (ms < 800) return 'Excellent'
    if (ms <= 1500) return 'Normal'
    return 'Slow'
  }

  const getGSTClass = (speed) => {
    if (!speed) return '-'
    if (speed >= 120) return 'Normal GST'
    if (speed < 80) return 'Abnormal GST'
    return 'Borderline'
  }

  const getInterpretation = (s) => {
    if (s.hStatus === 'Good') {
      return `${s.name} demonstrates good gaze stabilization. Vestibulo-ocular reflex is functioning within normal range. Suitable for full sports participation.`
    }
    if (s.hStatus === 'Poor') {
      return `${s.name} shows poor gaze stabilization. Further clinical assessment is strongly recommended before returning to sports. Consider vestibular rehabilitation.`
    }
    if (s.hStatus === 'Moderate') {
      return `${s.name} shows moderate gaze stabilization. Monitor performance and retest after 2-4 weeks of vestibular training. Cleared for light training with caution.`
    }
    return 'Complete the test for full clinical interpretation.'
  }

  const drawLine = () => {
    doc.setDrawColor(40, 40, 40)
    doc.line(margin, y, pageW - margin, y)
    y += 6
  }

  const checkPage = (needed = 20) => {
    if (y + needed > pageH - 16) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFillColor(0, 0, 0)
  doc.rect(0, 0, pageW, 32, 'F')

  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('MGST Report', margin, 14)

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text('Modified Gaze Stabilization Test — Clinical Research Tool', margin, 22)

  const now = new Date()
  doc.text(
    `Generated: ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN')}`,
    pageW - margin,
    22,
    { align: 'right' }
  )

  y = 42

  sessions.forEach((s, index) => {
    checkPage(110)

    doc.setFontSize(13)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text(`${index + 1}. ${s.name}`, margin, y)
    y += 6

    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${s.date} · ${s.time || ''} · ${s.sport} · Age ${s.age} · SVA ${s.sva}`,
      margin, y
    )
    y += 5

    if (s.dominantEye || s.notes) {
      doc.setTextColor(100, 100, 100)
      doc.text(
        `Dominant Eye: ${s.dominantEye || '-'}   Notes: ${s.notes || '-'}`,
        margin, y
      )
      y += 8
    } else {
      y += 4
    }

    const hColor = s.hStatus === 'Good'
      ? [34, 197, 94]
      : s.hStatus === 'Moderate'
      ? [161, 161, 161]
      : [220, 38, 38]

    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'normal')
    doc.text('GAZE STABILIZATION TEST', margin, y)
    y += 5

    doc.setFontSize(20)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'normal')
    doc.text(s.hScore, margin, y + 8)

    doc.setFontSize(9)
    doc.setTextColor(...hColor)
    doc.setFont('helvetica', 'bold')
    doc.text(s.hStatus, margin, y + 16)

    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text(`Accuracy: ${s.hAccuracy}%`, margin, y + 22)
    doc.text(
      `Avg RT: ${s.hAvgReactionTime || '-'}ms (${getRTLabel(s.hAvgReactionTime)})`,
      margin, y + 28
    )

    if (s.hHeadMovement) {
      doc.text(
        `Head Velocity: ${s.hHeadMovement.avgSpeed}°/s avg, ${s.hHeadMovement.peakSpeed}°/s peak — ${getGSTClass(s.hHeadMovement.avgSpeed)} · ${s.hHeadMovement.totalSwings} swings`,
        margin, y + 34
      )
    }

    if (s.hAvgClarityGrade !== undefined) {
      doc.text(
        `Avg Clarity Grade: ${s.hAvgClarityGrade} / 3`,
        margin, y + 40
      )
    }

    y += 48

    if (s.hTrialScores?.length > 0) {
      doc.setFontSize(7)
      doc.setTextColor(80, 80, 80)
      doc.text('Trials:', margin, y)
      s.hTrialScores.forEach((score, ti) => {
        doc.text(
          `T${ti + 1}: ${score}/10 (${s.hTrialData?.[ti]?.avgReactionTime || '-'}ms, clarity ${s.hTrialData?.[ti]?.avgClarityGrade ?? '-'}/3)`,
          margin + 14 + (ti * 60), y
        )
      })
      y += 8
    }

    checkPage(20)
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'bold')
    doc.text('CLINICAL INTERPRETATION', margin, y)
    y += 5

    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    const interpretation = getInterpretation(s)
    const split = doc.splitTextToSize(interpretation, pageW - margin * 2)
    doc.text(split, margin, y)
    y += split.length * 4 + 6

    y += 4
    drawLine()
    y += 4
  })

  doc.setFontSize(7)
  doc.setTextColor(60, 60, 60)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'This report is generated by the MGST Clinical Research Tool. For research and screening purposes only.',
    pageW / 2,
    pageH - 8,
    { align: 'center' }
  )

  doc.save(
    `MGST_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`
  )
}