// PDF Generator for Apartment Maintenance Collection Sheet and Detailed Breakdown
import type { ParsedFlatRow, ParseResult } from './excelParser'

// Load jsPDF dynamically if available
async function loadJsPDF(): Promise<any> {
  if (typeof window === 'undefined') return null
  if ((window as any).jspdf) return (window as any).jspdf

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.async = true
    script.onload = () => {
      // Also load autotable plugin
      const autoTableScript = document.createElement('script')
      autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
      autoTableScript.async = true
      autoTableScript.onload = () => resolve((window as any).jspdf)
      autoTableScript.onerror = () => resolve((window as any).jspdf) // still return base jspdf
      document.head.appendChild(autoTableScript)
    }
    script.onerror = () => reject(new Error('Failed to load jsPDF library'))
    document.head.appendChild(script)
  })
}

// Generate printable HTML representation (100% fidelity to user's screenshot)
export function generatePrintableHTML(data: ParseResult, customTitle?: string): string {
  const title = (customTitle || `${data.apartmentTitle || 'APARTMENT'} ${data.monthLabel || data.billingMonth} MAINTENANCE SHEET`).toUpperCase()
  const rows = data.rows

  // Split rows for Page 1 two-column layout:
  // Left: G1 to A-207 (21 rows if 35 total), Right: A-301 to A-407 (14 rows)
  const midpoint = Math.ceil(rows.length / 2)
  // Check if we can cleanly split at A-301 or near midpoint
  let splitIdx = rows.findIndex((r) => r.flatNumber.toUpperCase().startsWith('A-3'))
  if (splitIdx === -1 || splitIdx < 10) splitIdx = midpoint

  const leftRows = rows.slice(0, splitIdx)
  const rightRows = rows.slice(splitIdx)

  const renderTableRows = (flatList: ParsedFlatRow[]) => {
    return flatList
      .map(
        (r) => `
      <tr>
        <td class="flat-col">${r.flatNumber}</td>
        <td class="amount-col">${Number(r.totalAmount).toLocaleString('en-IN')}</td>
        <td class="date-col"></td>
        <td class="sign-col"></td>
      </tr>`
      )
      .join('')
  }

  const renderDetailedRows = (flatList: ParsedFlatRow[]) => {
    return flatList
      .map((r) => {
        const hasExcess = r.manjeeraTankerAmt > 0 || r.pvtTankerAmt > 0
        const rowClass = hasExcess ? 'excess-row' : ''
        return `
      <tr class="${rowClass}">
        <td><strong>${r.flatNumber}</strong></td>
        <td>${r.newMeter || 'New'}</td>
        <td>${r.meterStart !== undefined ? r.meterStart.toLocaleString('en-IN') : '—'}</td>
        <td>${r.meterEnd !== undefined ? r.meterEnd.toLocaleString('en-IN') : '—'}</td>
        <td class="${hasExcess ? 'highlight-text' : ''}">${(r.waterUsed || 0).toLocaleString('en-IN')}</td>
        <td>${(r.manjeeraExempt || 18500).toLocaleString('en-IN')}</td>
        <td>${(r.manjeeraUsage || 0).toLocaleString('en-IN')}</td>
        <td>${(r.totalTankerUsage || 0).toLocaleString('en-IN')}</td>
        <td>${(r.manjeeraTankerUsed || 0).toLocaleString('en-IN')}</td>
        <td>${(r.pvtTankerUsed || 0).toLocaleString('en-IN')}</td>
        <td>${r.tankerPricePerLtr || 0.13}</td>
        <td>${r.pvtTankerPricePerLtr || 0.35}</td>
        <td>${r.manjeeraTankerAmt > 0 ? r.manjeeraTankerAmt.toLocaleString('en-IN') : '0'}</td>
        <td>${r.pvtTankerAmt > 0 ? r.pvtTankerAmt.toLocaleString('en-IN') : '0'}</td>
        <td>${r.hmwssbBill}</td>
        <td>${r.commonMaint}</td>
        <td class="bold-amt">₹${Number(r.totalAmount).toLocaleString('en-IN')}</td>
      </tr>`
      })
      .join('')
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    @page landscape-page {
      size: A4 landscape;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 10px;
      color: #0f172a;
      background: #fff;
    }
    .page {
      page-break-after: always;
      margin-bottom: 20px;
    }
    .page.landscape {
      page-break-before: always;
      page: landscape-page;
    }
    .header-title {
      text-align: center;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 15px 0 25px 0;
      color: #000;
    }
    .sheet-container {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .sheet-column {
      flex: 1;
    }
    table.summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    table.summary-table th {
      background: #475569 !important;
      color: #ffffff !important;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #334155;
    }
    table.summary-table td {
      border: 1px solid #cbd5e1;
      padding: 5.5px 8px;
      height: 24px;
    }
    table.summary-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .flat-col {
      width: 22%;
      font-weight: 700;
      color: #0f172a;
    }
    .amount-col {
      width: 28%;
      text-align: right;
      font-weight: 700;
      padding-right: 12px !important;
    }
    .date-col {
      width: 25%;
    }
    .sign-col {
      width: 25%;
    }
    
    /* Detailed Breakdown Table */
    table.detail-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-top: 10px;
    }
    table.detail-table th {
      background: #334155 !important;
      color: #fff !important;
      font-weight: 700;
      padding: 5px 4px;
      border: 1px solid #1e293b;
      text-align: center;
      vertical-align: middle;
    }
    table.detail-table td {
      border: 1px solid #cbd5e1;
      padding: 4px;
      text-align: center;
    }
    table.detail-table tr.excess-row {
      background-color: #fef2f2 !important;
    }
    .highlight-text {
      color: #b91c1c;
      font-weight: 700;
    }
    .bold-amt {
      font-weight: 800;
      color: #0f172a;
    }
    .total-banner {
      display: flex;
      justify-content: space-between;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 15px;
      border-radius: 4px;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Print Controls -->
  <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #e0e7ff; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
    <div>
      <strong style="color: #3730a3; font-size: 14px;">Maintenance Sheet Preview</strong>
      <p style="margin: 2px 0 0 0; font-size: 12px; color: #4338ca;">Page 1: Resident Signature Sheet | Page 2+: Detailed Water & Meter Breakdown</p>
    </div>
    <button onclick="window.print()" style="background: #4f46e5; color: #fff; border: 0; padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <!-- Page 1: Signature Collection Sheet (Exact 2-column format) -->
  <div class="page">
    <div class="header-title">${title}</div>
    <div class="sheet-container">
      <!-- Left Column (G1 to A-207) -->
      <div class="sheet-column">
        <table class="summary-table">
          <thead>
            <tr>
              <th class="flat-col">Flat No</th>
              <th class="amount-col">Total Amount</th>
              <th class="date-col">Date</th>
              <th class="sign-col">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(leftRows)}
          </tbody>
        </table>
      </div>

      <!-- Right Column (A-301 to A-407) -->
      <div class="sheet-column">
        <table class="summary-table">
          <thead>
            <tr>
              <th class="flat-col">Flat No</th>
              <th class="amount-col">Total Amount</th>
              <th class="date-col">Date</th>
              <th class="sign-col">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(rightRows)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Summary Box -->
    <div class="total-banner">
      <span>Total Flats: ${rows.length}</span>
      <span>Flats with Excess Water: ${data.flatsWithExcessCount}</span>
      <span>Total Maintenance to Collect: ₹${data.totalAmount.toLocaleString('en-IN')}</span>
    </div>
  </div>

  <!-- Page 2: Detailed Breakdown Table (Landscape) -->
  <div class="page landscape">
    <div class="header-title">${data.apartmentTitle || 'APARTMENT'} - DETAILED WATER & MAINTENANCE BREAKDOWN (${data.monthLabel || data.billingMonth})</div>
    <table class="detail-table">
      <thead>
        <tr>
          <th>Flat No</th>
          <th>Meter</th>
          <th>Start Rdg</th>
          <th>End Rdg</th>
          <th>Water Used (L)</th>
          <th>Manjeera Exempt</th>
          <th>Manjeera Usage</th>
          <th>Tanker Usage (L)</th>
          <th>Manjeera Tanker Used</th>
          <th>Pvt Tanker Used</th>
          <th>Tanker Rate</th>
          <th>Pvt Rate</th>
          <th>Manjeera Tanker ₹</th>
          <th>Pvt Tanker ₹</th>
          <th>HMWSSB ₹</th>
          <th>Common ₹</th>
          <th>Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${renderDetailedRows(rows)}
      </tbody>
      <tfoot>
        <tr style="background: #e2e8f0; font-weight: 800;">
          <td colspan="4" style="text-align: right; padding-right: 8px;">TOTALS:</td>
          <td>${data.totalWaterUsed.toLocaleString('en-IN')}</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>₹${rows.reduce((s, r) => s + r.manjeeraTankerAmt, 0).toLocaleString('en-IN')}</td>
          <td>₹${rows.reduce((s, r) => s + r.pvtTankerAmt, 0).toLocaleString('en-IN')}</td>
          <td>₹${rows.reduce((s, r) => s + r.hmwssbBill, 0).toLocaleString('en-IN')}</td>
          <td>₹${rows.reduce((s, r) => s + r.commonMaint, 0).toLocaleString('en-IN')}</td>
          <td style="color: #4338ca; font-size: 11px;">₹${data.totalAmount.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</body>
</html>
  `
}

// Open printable window for instant viewing / printing / Saving as PDF
export function openPrintWindow(data: ParseResult, customTitle?: string) {
  const html = generatePrintableHTML(data, customTitle)
  const printWindow = window.open('', '_blank', 'width=900,height=750')
  if (!printWindow) {
    alert('Pop-up blocked! Please allow pop-ups for this site to view the PDF print preview.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

// Direct PDF download using jsPDF (fallback to printable window if CDN blocked)
export async function downloadMaintenancePDF(data: ParseResult, customTitle?: string) {
  try {
    const jspdfModule = await loadJsPDF()
    const { jsPDF } = jspdfModule
    const doc = new jsPDF('p', 'mm', 'a4')

    const title = (customTitle || `${data.apartmentTitle || 'APARTMENT'} ${data.monthLabel || data.billingMonth} MAINTENANCE SHEET`).toUpperCase()
    const rows = data.rows

    // Page 1 Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(title, 105, 14, { align: 'center' })

    // Split rows for two-column table
    let splitIdx = rows.findIndex((r) => r.flatNumber.toUpperCase().startsWith('A-3'))
    if (splitIdx === -1 || splitIdx < 10) splitIdx = Math.ceil(rows.length / 2)

    const leftRows = rows.slice(0, splitIdx)
    const rightRows = rows.slice(splitIdx)

    const autoTable = (doc as any).autoTable

    if (autoTable) {
      // Left Table
      autoTable(doc, {
        startY: 20,
        margin: { left: 10, right: 110 },
        tableWidth: 90,
        head: [['Flat No', 'Total Amount', 'Date', 'Signature']],
        body: leftRows.map((r) => [r.flatNumber, Number(r.totalAmount).toLocaleString('en-IN'), '', '']),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225] },
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          2: { cellWidth: 23 },
          3: { cellWidth: 23 },
        },
      })

      // Right Table
      autoTable(doc, {
        startY: 20,
        margin: { left: 110, right: 10 },
        tableWidth: 90,
        head: [['Flat No', 'Total Amount', 'Date', 'Signature']],
        body: rightRows.map((r) => [r.flatNumber, Number(r.totalAmount).toLocaleString('en-IN'), '', '']),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [203, 213, 225] },
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          2: { cellWidth: 23 },
          3: { cellWidth: 23 },
        },
      })

      // Page 2: Detailed Breakdown (Landscape)
      doc.addPage('a4', 'l')
      doc.setFontSize(12)
      doc.text(`${data.apartmentTitle || 'APARTMENT'} - DETAILED WATER & MAINTENANCE BREAKDOWN (${data.monthLabel || data.billingMonth})`, 148, 12, { align: 'center' })

      autoTable(doc, {
        startY: 18,
        head: [[
          'Flat', 'Meter', 'Start', 'End', 'Water (L)', 'Exempt', 'Usage', 'Tanker (L)',
          'M-Tanker', 'P-Tanker', 'Rate', 'P-Rate', 'Tanker ₹', 'Pvt ₹', 'HMWSSB', 'Common', 'Total ₹'
        ]],
        body: rows.map((r) => [
          r.flatNumber,
          r.newMeter || 'New',
          r.meterStart || '—',
          r.meterEnd || '—',
          (r.waterUsed || 0).toLocaleString('en-IN'),
          (r.manjeeraExempt || 18500).toLocaleString('en-IN'),
          (r.manjeeraUsage || 0).toLocaleString('en-IN'),
          (r.totalTankerUsage || 0).toLocaleString('en-IN'),
          (r.manjeeraTankerUsed || 0).toLocaleString('en-IN'),
          (r.pvtTankerUsed || 0).toLocaleString('en-IN'),
          r.tankerPricePerLtr || 0.13,
          r.pvtTankerPricePerLtr || 0.35,
          r.manjeeraTankerAmt || 0,
          r.pvtTankerAmt || 0,
          r.hmwssbBill,
          r.commonMaint,
          Number(r.totalAmount).toLocaleString('en-IN'),
        ]),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, halign: 'center', lineColor: [203, 213, 225] },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        didParseCell: (hookData: any) => {
          if (hookData.section === 'body') {
            const rowIndex = hookData.row.index
            const rowData = rows[rowIndex]
            if (rowData && (rowData.manjeeraTankerAmt > 0 || rowData.pvtTankerAmt > 0)) {
              hookData.cell.styles.fillColor = [254, 242, 242]
            }
          }
        },
      })

      const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
      doc.save(fileName)
      return
    }

    // Fallback if autoTable not loaded
    openPrintWindow(data, customTitle)
  } catch (err) {
    console.warn('Direct jsPDF download failed, falling back to print window:', err)
    openPrintWindow(data, customTitle)
  }
}
