// Comprehensive Parser & Calculation Engine for Water Meter & Maintenance Sheets

export interface ParsedFlatRow {
  flatNumber: string
  newMeter?: string
  meterStart?: number
  meterEnd?: number
  waterUsed: number
  manjeeraExempt: number
  manjeeraUsage: number
  totalTankerUsage: number
  manjeeraTankerExempt: number
  manjeeraTankerUsed: number
  tankerPricePerLtr: number
  pvtTankerUsed: number
  pvtTankerPricePerLtr: number
  manjeeraTankerAmt: number
  pvtTankerAmt: number
  hmwssbBill: number
  commonMaint: number
  totalAmount: number
  date?: string
  signature?: string
  remarks?: string
}

export interface CalculationConfig {
  manjeeraExemptLimit: number // e.g. 18500 (latest Oct 2026) or 17500 (March 2026)
  manjeeraTankerExemptLimit: number // e.g. 8000 or 16000
  tankerRate: number // e.g. 0.13
  pvtTankerRate: number // e.g. 0.35 (latest Oct 2026) or 0.30 (older months)
  hmwssbBill: number // e.g. 160 (or 150/140 in 2024/2023)
  commonMaint: number // e.g. 1200 (or 1000 in 2023)
}

export const LATEST_OCT_2026_CONFIG: CalculationConfig = {
  manjeeraExemptLimit: 18500,
  manjeeraTankerExemptLimit: 8000,
  tankerRate: 0.13,
  pvtTankerRate: 0.35,
  hmwssbBill: 160,
  commonMaint: 1200,
}

export interface ParseResult {
  apartmentTitle?: string
  billingMonth: string // YYYY-MM
  monthLabel: string // e.g. "OCT-2026"
  rows: ParsedFlatRow[]
  totalAmount: number
  totalWaterUsed: number
  totalTankerAmt: number
  flatsWithExcessCount: number
  config?: CalculationConfig
  allSections?: { label: string; billingMonth: string; result: ParseResult }[]
}

// Clean number parser
function parseNum(val: any, defaultVal = 0): number {
  if (val === undefined || val === null || val === '') return defaultVal
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val
  const cleaned = String(val).replace(/,/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? defaultVal : n
}

// Check if string is a valid flat number (G1..G7, A-101..A-407, etc.)
export function isValidFlatNumber(str: string): boolean {
  if (!str) return false
  const s = str.trim().toUpperCase()
  if (['WATCHMEN', 'WATCH MEN', 'TOTAL', 'CALCULATIONS:', 'RECONCIL', 'TANKER', 'DATE', 'FLAT NO', 'PER DAY'].includes(s)) {
    return false
  }
  if (s.startsWith('TOTAL') || s.startsWith('AVERAGE') || s.includes('METER READING') || s.includes('CALCULATIONS')) {
    return false
  }
  return /^(G-?\d+|[A-Z]-?\d{3,4}|\d{3,4})$/i.test(s)
}

// Core calculation logic matching the apartment's water & maintenance rules:
// 1. Water Used = (End - Start) * 10 (except A-105 which is 1x)
// 2. Total Tanker Usage = MAX(0, Water Used - Manjeera Exemption)
// 3. Manjeera Tanker Used = MIN(Total Tanker Usage, Manjeera Tanker Exemption)
// 4. Pvt Tanker Used = MAX(0, Total Tanker Usage - Manjeera Tanker Used)
// 5. Manjeera Tanker Amt = ROUND(Manjeera Tanker Used * Tanker Rate)
// 6. Pvt Tanker Amt = ROUND(Pvt Tanker Used * Pvt Tanker Rate)
// 7. Total Amount = HMWSSB Bill + Common Maint + Manjeera Tanker Amt + Pvt Tanker Amt
export function computeFlatRow(
  raw: Partial<ParsedFlatRow>,
  cfg: CalculationConfig
): ParsedFlatRow {
  const flatNumber = (raw.flatNumber || '').trim().toUpperCase()
  const isOldMeter = raw.newMeter?.toLowerCase() === 'old' || flatNumber === 'A-105'

  // Calculate or verify water used from start/end readings
  let waterUsed = raw.waterUsed ?? 0
  if (raw.meterStart !== undefined && raw.meterEnd !== undefined && raw.meterEnd >= raw.meterStart) {
    const diff = raw.meterEnd - raw.meterStart
    // Don't add '0 for flat 105 (explicit rule in apartment sheets)
    if (flatNumber === 'A-105' || flatNumber === '105') {
      waterUsed = diff
    } else if (diff > 50000 && isOldMeter) {
      waterUsed = diff
    } else {
      waterUsed = diff * 10
    }
  }

  const exempt = cfg.manjeeraExemptLimit
  const manjeeraUsage = Math.min(waterUsed, exempt)
  const totalTankerUsage = Math.max(0, waterUsed - exempt)

  const tankerExempt = cfg.manjeeraTankerExemptLimit
  const manjeeraTankerUsed = Math.min(totalTankerUsage, tankerExempt)
  const pvtTankerUsed = Math.max(0, totalTankerUsage - manjeeraTankerUsed)

  const manjeeraTankerAmt = Math.round(manjeeraTankerUsed * cfg.tankerRate)
  const pvtTankerAmt = Math.round(pvtTankerUsed * cfg.pvtTankerRate)
  const hmwssbBill = cfg.hmwssbBill
  const commonMaint = cfg.commonMaint
  const totalAmount = hmwssbBill + commonMaint + manjeeraTankerAmt + pvtTankerAmt

  return {
    flatNumber: raw.flatNumber || '',
    newMeter: raw.newMeter || (isOldMeter ? 'Old' : 'New'),
    meterStart: raw.meterStart,
    meterEnd: raw.meterEnd,
    waterUsed,
    manjeeraExempt: exempt,
    manjeeraUsage,
    totalTankerUsage,
    manjeeraTankerExempt: tankerExempt,
    manjeeraTankerUsed,
    tankerPricePerLtr: cfg.tankerRate,
    pvtTankerUsed,
    pvtTankerPricePerLtr: cfg.pvtTankerRate,
    manjeeraTankerAmt,
    pvtTankerAmt,
    hmwssbBill,
    commonMaint,
    totalAmount,
    date: raw.date || '',
    signature: raw.signature || '',
  }
}

// Recompute all rows with updated configuration
export function recalculateRows(
  rows: ParsedFlatRow[],
  cfg: CalculationConfig
): { rows: ParsedFlatRow[]; totalAmount: number; totalWaterUsed: number; totalTankerAmt: number; flatsWithExcessCount: number } {
  const recalculated = rows.map((r) => computeFlatRow(r, cfg))
  const totalAmount = recalculated.reduce((s, r) => s + r.totalAmount, 0)
  const totalWaterUsed = recalculated.reduce((s, r) => s + r.waterUsed, 0)
  const totalTankerAmt = recalculated.reduce((s, r) => s + r.manjeeraTankerAmt + r.pvtTankerAmt, 0)
  const flatsWithExcessCount = recalculated.filter((r) => r.manjeeraTankerAmt > 0 || r.pvtTankerAmt > 0).length

  return {
    rows: recalculated,
    totalAmount,
    totalWaterUsed,
    totalTankerAmt,
    flatsWithExcessCount,
  }
}

// Native CSV parser
export function parseCSVToMatrix(text: string): string[][] {
  const lines: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++
      currentRow.push(currentCell.trim())
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow)
    }
  }

  return lines
}

// Detect month from header text
export function detectMonth(text: string): { billingMonth: string; label: string } | null {
  const monthMap: Record<string, string> = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  }

  const textMonthMatch = text.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[ -_](\d{4}|\d{2})\b/i)
  if (textMonthMatch) {
    const m = textMonthMatch[1].toUpperCase().slice(0, 3)
    let y = textMonthMatch[2]
    if (y.length === 2) y = '20' + y
    const mm = monthMap[m] || '01'
    return { billingMonth: `${y}-${mm}`, label: `${m}-${y}` }
  }

  const dateMatch = text.match(/\b\d{1,2}[\/-](\d{1,2})[\/-](\d{2,4})\b/)
  if (dateMatch) {
    const mm = dateMatch[1].padStart(2, '0')
    let y = dateMatch[2]
    if (y.length === 2) y = '20' + y
    const mName = Object.keys(monthMap).find((k) => monthMap[k] === mm) || mm
    return { billingMonth: `${y}-${mm}`, label: `${mName}-${y}` }
  }

  return null
}

// Parse a single section of matrix starting from a specific header row index up to next header or end
export function parseSingleSection(
  matrix: string[][],
  headerRowIndex: number,
  endRowIndex: number,
  defaultMonth?: string
): ParseResult {
  const headerRow = matrix[headerRowIndex]
  let detectedMonth = defaultMonth || ''
  let detectedLabel = ''

  // Look for date in header row or rows directly above/below
  for (let r = Math.max(0, headerRowIndex - 2); r <= Math.min(matrix.length - 1, headerRowIndex + 1); r++) {
    const text = matrix[r].join(' ')
    const dm = detectMonth(text)
    if (dm) {
      detectedMonth = dm.billingMonth
      detectedLabel = dm.label
      break
    }
  }

  const colMap: Record<string, number> = {}
  let inSideTable = false

  headerRow.forEach((h, idx) => {
    const cleanH = h.toLowerCase().replace(/\s+/g, ' ').trim()

    // Stop mapping flat columns when side calculation/reconciliation tables start
    if (/^tanker$|no\s*of\s*water\s*tanker|^calculations:?|^reconcil/i.test(cleanH)) {
      inSideTable = true
    }
    if (inSideTable) return

    if (/flat\s*no/i.test(cleanH) && colMap.flatNo === undefined) colMap.flatNo = idx
    else if (/new\s*meter/i.test(cleanH) && colMap.newMeter === undefined) colMap.newMeter = idx
    else if (/start\s*reading/i.test(cleanH) && colMap.meterStart === undefined) colMap.meterStart = idx
    else if (/end\s*reading/i.test(cleanH) && colMap.meterEnd === undefined) colMap.meterEnd = idx
    else if (/water\s*used|total\s*water\s*usage/i.test(cleanH) && colMap.waterUsed === undefined) colMap.waterUsed = idx
    else if (/manjeera\s*water\s*ex/i.test(cleanH) && colMap.manjeeraExempt === undefined) colMap.manjeeraExempt = idx
    else if (/manjeera\s*water\s*usage|majeera\s*pipe\s*water/i.test(cleanH) && colMap.manjeeraUsage === undefined) colMap.manjeeraUsage = idx
    else if (/total\s*tanker\s*water/i.test(cleanH) && colMap.totalTankerUsage === undefined) colMap.totalTankerUsage = idx
    else if (/manjeera\s*tanker\s*ex/i.test(cleanH) && colMap.manjeeraTankerExempt === undefined) colMap.manjeeraTankerExempt = idx
    else if (/manjeera\s*tanker\s*water\s*used|majeera\s*tanker/i.test(cleanH) && !/amt|amount/i.test(cleanH) && colMap.manjeeraTankerUsed === undefined) colMap.manjeeraTankerUsed = idx
    else if (/tanker\s*(?:water\s*)?price/i.test(cleanH) && colMap.tankerPrice === undefined) colMap.tankerPrice = idx
    else if (/pvt\s*tanker\s*water\s*use/i.test(cleanH) && colMap.pvtTankerUsed === undefined) colMap.pvtTankerUsed = idx
    else if (/private\s*tanker\s*price/i.test(cleanH) && colMap.pvtTankerPrice === undefined) colMap.pvtTankerPrice = idx
    else if (/manjeera\s*tanker\s*amt|manjeera\s*tanker\s*amount/i.test(cleanH) && colMap.manjeeraTankerAmt === undefined) colMap.manjeeraTankerAmt = idx
    else if (/pvt\s*tanker\s*amt|private\s*tanker\s*amount/i.test(cleanH) && colMap.pvtTankerAmt === undefined) colMap.pvtTankerAmt = idx
    else if (/hmwssb|manjeera\s*pipe\s*amt|manjeera\s*pipe\s*amount/i.test(cleanH) && colMap.hmwssbBill === undefined) colMap.hmwssbBill = idx
    else if (/common\s*maint/i.test(cleanH) && colMap.commonMaint === undefined) colMap.commonMaint = idx
    else if (/total\s*amount|total\s*bill/i.test(cleanH) && colMap.totalAmount === undefined) colMap.totalAmount = idx
    else if (/date/i.test(cleanH) && !/start|end/i.test(cleanH) && colMap.date === undefined) colMap.date = idx
    else if (/signature|sign/i.test(cleanH) && colMap.signature === undefined) colMap.signature = idx
  })

  // Detect sheet configuration (exemptions and rates)
  let detectedExempt = 18500
  let detectedTankerExempt = 8000
  let detectedTankerPrice = 0.13
  let detectedPvtPrice = 0.35
  let detectedHmwssb = 160
  let detectedCommon = 1200

  // Parse rows
  const parsedRows: ParsedFlatRow[] = []

  for (let r = headerRowIndex + 1; r < endRowIndex; r++) {
    const row = matrix[r]
    if (!row || row.length === 0) continue

    const flatNoVal = row[colMap.flatNo ?? 0]?.trim()
    if (!isValidFlatNumber(flatNoVal)) continue

    const rowExempt = colMap.manjeeraExempt !== undefined ? parseNum(row[colMap.manjeeraExempt]) : 0
    if (rowExempt > 0) detectedExempt = rowExempt

    const rowTankerExempt = colMap.manjeeraTankerExempt !== undefined ? parseNum(row[colMap.manjeeraTankerExempt]) : 0
    if (rowTankerExempt > 0) detectedTankerExempt = rowTankerExempt

    const rowTankerPrice = colMap.tankerPrice !== undefined ? parseNum(row[colMap.tankerPrice]) : 0
    if (rowTankerPrice > 0) detectedTankerPrice = rowTankerPrice

    const rowPvtPrice = colMap.pvtTankerPrice !== undefined ? parseNum(row[colMap.pvtTankerPrice]) : 0
    if (rowPvtPrice > 0) detectedPvtPrice = rowPvtPrice

    const rowHmwssb = colMap.hmwssbBill !== undefined ? parseNum(row[colMap.hmwssbBill]) : 0
    if (rowHmwssb > 0) detectedHmwssb = rowHmwssb

    const rowCommon = colMap.commonMaint !== undefined ? parseNum(row[colMap.commonMaint]) : 0
    if (rowCommon > 0) detectedCommon = rowCommon

    const rowStart = colMap.meterStart !== undefined ? parseNum(row[colMap.meterStart]) : undefined
    const rowEnd = colMap.meterEnd !== undefined ? parseNum(row[colMap.meterEnd]) : undefined
    const rowWaterUsed = colMap.waterUsed !== undefined ? parseNum(row[colMap.waterUsed]) : 0
    const rowTotal = colMap.totalAmount !== undefined ? parseNum(row[colMap.totalAmount]) : 0
    const rowManjAmt = colMap.manjeeraTankerAmt !== undefined ? parseNum(row[colMap.manjeeraTankerAmt]) : 0
    const rowPvtAmt = colMap.pvtTankerAmt !== undefined ? parseNum(row[colMap.pvtTankerAmt]) : 0
    const newMeter = colMap.newMeter !== undefined ? row[colMap.newMeter]?.trim() : undefined

    parsedRows.push({
      flatNumber: flatNoVal,
      newMeter,
      meterStart: rowStart,
      meterEnd: rowEnd,
      waterUsed: rowWaterUsed,
      manjeeraExempt: detectedExempt,
      manjeeraUsage: colMap.manjeeraUsage !== undefined ? parseNum(row[colMap.manjeeraUsage]) : Math.min(rowWaterUsed, detectedExempt),
      totalTankerUsage: colMap.totalTankerUsage !== undefined ? parseNum(row[colMap.totalTankerUsage]) : Math.max(0, rowWaterUsed - detectedExempt),
      manjeeraTankerExempt: detectedTankerExempt,
      manjeeraTankerUsed: colMap.manjeeraTankerUsed !== undefined ? parseNum(row[colMap.manjeeraTankerUsed]) : 0,
      tankerPricePerLtr: detectedTankerPrice,
      pvtTankerUsed: colMap.pvtTankerUsed !== undefined ? parseNum(row[colMap.pvtTankerUsed]) : 0,
      pvtTankerPricePerLtr: detectedPvtPrice,
      manjeeraTankerAmt: rowManjAmt,
      pvtTankerAmt: rowPvtAmt,
      hmwssbBill: detectedHmwssb,
      commonMaint: detectedCommon,
      totalAmount: (rowTotal > 0 && rowTotal < 25000) ? rowTotal : (detectedHmwssb + detectedCommon + rowManjAmt + rowPvtAmt),
      date: colMap.date !== undefined ? row[colMap.date] : '',
      signature: colMap.signature !== undefined ? row[colMap.signature] : '',
    })
  }

  // Sort flats: G1..G7, A-101..A-107, etc.
  parsedRows.sort((a, b) => {
    const parseKey = (fn: string) => {
      const u = fn.toUpperCase().replace(/\s+/g, '')
      if (u.startsWith('G')) {
        const n = parseInt(u.replace('G', '').replace('-', ''), 10) || 0
        return 0 * 1000 + n
      }
      const match = u.match(/\d+/)
      return match ? parseInt(match[0], 10) : 9999
    }
    return parseKey(a.flatNumber) - parseKey(b.flatNumber)
  })

  const sectionConfig: CalculationConfig = {
    manjeeraExemptLimit: detectedExempt,
    manjeeraTankerExemptLimit: detectedTankerExempt,
    tankerRate: detectedTankerPrice,
    pvtTankerRate: detectedPvtPrice,
    hmwssbBill: detectedHmwssb,
    commonMaint: detectedCommon,
  }

  const totalAmount = parsedRows.reduce((s, r) => s + r.totalAmount, 0)
  const totalWaterUsed = parsedRows.reduce((s, r) => s + r.waterUsed, 0)
  const totalTankerAmt = parsedRows.reduce((s, r) => s + r.manjeeraTankerAmt + r.pvtTankerAmt, 0)
  const flatsWithExcessCount = parsedRows.filter((r) => r.manjeeraTankerAmt > 0 || r.pvtTankerAmt > 0).length

  return {
    apartmentTitle: 'TULASIVANAM A-BLOCK',
    billingMonth: detectedMonth || '2026-10',
    monthLabel: detectedLabel || detectedMonth || 'OCT-2026',
    rows: parsedRows,
    totalAmount,
    totalWaterUsed,
    totalTankerAmt,
    flatsWithExcessCount,
    config: sectionConfig,
  }
}

// Finds ALL month sections in a stacked matrix (e.g., CSV with March, Feb, Jan sections)
export function parseAllSectionsFromMatrix(matrix: string[][], defaultMonth?: string): ParseResult {
  const headerIndices: number[] = []

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r]
    if (row.some((c) => /flat\s*no/i.test(c))) {
      headerIndices.push(r)
    }
  }

  if (headerIndices.length === 0) {
    throw new Error('No header row containing "Flat No" found in the uploaded file.')
  }

  const sections: { label: string; billingMonth: string; result: ParseResult }[] = []

  for (let i = 0; i < headerIndices.length; i++) {
    const startIdx = headerIndices[i]
    const endIdx = i + 1 < headerIndices.length ? headerIndices[i + 1] : matrix.length
    const secResult = parseSingleSection(matrix, startIdx, endIdx, defaultMonth)
    if (secResult.rows.length > 0) {
      sections.push({
        label: secResult.monthLabel,
        billingMonth: secResult.billingMonth,
        result: secResult,
      })
    }
  }

  // Primary result is the first section (or latest)
  const primaryResult = sections[0].result
  primaryResult.allSections = sections
  return primaryResult
}

// Dynamically load SheetJS from CDN for Excel binary (.xlsx/.xls)
async function loadSheetJS(): Promise<any> {
  if (typeof window === 'undefined') return null
  if ((window as any).XLSX) return (window as any).XLSX

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    script.async = true
    script.onload = () => resolve((window as any).XLSX)
    script.onerror = () => reject(new Error('Failed to load SheetJS from CDN. Please upload a .csv file instead.'))
    document.head.appendChild(script)
  })
}

// Parse uploaded file (.xlsx, .xls, .csv, .txt)
export async function parseUploadedFile(file: File, defaultMonth?: string): Promise<ParseResult> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    const text = await file.text()
    const matrix = parseCSVToMatrix(text)
    return parseAllSectionsFromMatrix(matrix, defaultMonth)
  }

  // Excel binary (.xlsx or .xls)
  const XLSX = await loadSheetJS()
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  // Check if multiple sheets exist
  const allSections: { label: string; billingMonth: string; result: ParseResult }[] = []
  let primaryResult: ParseResult | null = null

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const matrix: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
    try {
      const secResult = parseAllSectionsFromMatrix(matrix, defaultMonth)
      if (secResult.rows.length > 0) {
        const dm = detectMonth(sheetName)
        const label = dm?.label || secResult.monthLabel || sheetName
        allSections.push({
          label,
          billingMonth: dm?.billingMonth || secResult.billingMonth,
          result: secResult,
        })
        if (!primaryResult) primaryResult = secResult
      }
    } catch {
      // Ignore sheets without valid flat headers
    }
  }

  if (!primaryResult || primaryResult.rows.length === 0) {
    throw new Error('Could not find flat maintenance tables in the uploaded Excel workbook.')
  }

  primaryResult.allSections = allSections
  return primaryResult
}

// Pre-computed October 2026 dataset directly matching the user's latest PDF screenshots
export function getLatestOct2026Result(): ParseResult {
  const rawRows: Partial<ParsedFlatRow>[] = [
    { flatNumber: 'G1', newMeter: 'New', meterStart: 32699, meterEnd: 34983, waterUsed: 22840 },
    { flatNumber: 'G2', newMeter: 'New', meterStart: 32011, meterEnd: 33142, waterUsed: 11310 },
    { flatNumber: 'G3', newMeter: 'New', meterStart: 34403, meterEnd: 35806, waterUsed: 14030 },
    { flatNumber: 'G4', newMeter: 'New', meterStart: 22625, meterEnd: 23905, waterUsed: 12800 },
    { flatNumber: 'G5', newMeter: 'Old', meterStart: 127186, meterEnd: 128207, waterUsed: 10210 },
    { flatNumber: 'G6', newMeter: 'New', meterStart: 28640, meterEnd: 29815, waterUsed: 11750 },
    { flatNumber: 'G7', newMeter: 'New', meterStart: 19854, meterEnd: 20736, waterUsed: 8820 },
    { flatNumber: 'A-101', newMeter: 'New', meterStart: 24130, meterEnd: 24851, waterUsed: 7210 },
    { flatNumber: 'A-102', newMeter: 'Old', meterStart: 110512, meterEnd: 111459, waterUsed: 9470 },
    { flatNumber: 'A-103', newMeter: 'New', meterStart: 20728, meterEnd: 21427, waterUsed: 6990 },
    { flatNumber: 'A-104', newMeter: 'New', meterStart: 43342, meterEnd: 44155, waterUsed: 8130 },
    { flatNumber: 'A-105', newMeter: 'Old', meterStart: 775141, meterEnd: 797073, waterUsed: 21932 },
    { flatNumber: 'A-106', newMeter: 'New', meterStart: 61489, meterEnd: 64869, waterUsed: 33800 },
    { flatNumber: 'A-107', newMeter: 'Old', meterStart: 111092, meterEnd: 112268, waterUsed: 11760 },
    { flatNumber: 'A-201', newMeter: 'New', meterStart: 34296, meterEnd: 35773, waterUsed: 14770 },
    { flatNumber: 'A-202', newMeter: 'New', meterStart: 37314, meterEnd: 38935, waterUsed: 16210 },
    { flatNumber: 'A-203', newMeter: 'New', meterStart: 13090, meterEnd: 14107, waterUsed: 10170 },
    { flatNumber: 'A-204', newMeter: 'New', meterStart: 37920, meterEnd: 38861, waterUsed: 9410 },
    { flatNumber: 'A-205', newMeter: 'Old', meterStart: 95814, meterEnd: 96939, waterUsed: 11250 },
    { flatNumber: 'A-206', newMeter: 'New', meterStart: 25851, meterEnd: 26321, waterUsed: 4700 },
    { flatNumber: 'A-207', newMeter: 'Old', meterStart: 130082, meterEnd: 131517, waterUsed: 14350 },
    { flatNumber: 'A-301', newMeter: 'New', meterStart: 31435, meterEnd: 32630, waterUsed: 11950 },
    { flatNumber: 'A-302', newMeter: 'New', meterStart: 21508, meterEnd: 22492, waterUsed: 9840 },
    { flatNumber: 'A-303', newMeter: 'New', meterStart: 25215, meterEnd: 26665, waterUsed: 14500 },
    { flatNumber: 'A-304', newMeter: 'New', meterStart: 18082, meterEnd: 18761, waterUsed: 6790 },
    { flatNumber: 'A-305', newMeter: 'Old', meterStart: 46504, meterEnd: 47797, waterUsed: 12930 },
    { flatNumber: 'A-306', newMeter: 'New', meterStart: 44905, meterEnd: 46689, waterUsed: 17840 },
    { flatNumber: 'A-307', newMeter: 'Old', meterStart: 82352, meterEnd: 83581, waterUsed: 12290 },
    { flatNumber: 'A-401', newMeter: 'New', meterStart: 15555, meterEnd: 16339, waterUsed: 7840 },
    { flatNumber: 'A-402', newMeter: 'Old', meterStart: 145372, meterEnd: 147003, waterUsed: 16310 },
    { flatNumber: 'A-403', newMeter: 'New', meterStart: 27238, meterEnd: 28063, waterUsed: 8250 },
    { flatNumber: 'A-404', newMeter: 'New', meterStart: 36978, meterEnd: 38816, waterUsed: 18380 },
    { flatNumber: 'A-405', newMeter: 'Old', meterStart: 102715, meterEnd: 103908, waterUsed: 11930 },
    { flatNumber: 'A-406', newMeter: 'New', meterStart: 19130, meterEnd: 19947, waterUsed: 8170 },
    { flatNumber: 'A-407', newMeter: 'Old', meterStart: 71632, meterEnd: 71714, waterUsed: 820 },
  ]

  const computedRows = rawRows.map((r) => computeFlatRow(r, LATEST_OCT_2026_CONFIG))
  const totalAmount = computedRows.reduce((s, r) => s + r.totalAmount, 0)
  const totalWaterUsed = computedRows.reduce((s, r) => s + r.waterUsed, 0)
  const totalTankerAmt = computedRows.reduce((s, r) => s + r.manjeeraTankerAmt + r.pvtTankerAmt, 0)
  const flatsWithExcessCount = computedRows.filter((r) => r.manjeeraTankerAmt > 0 || r.pvtTankerAmt > 0).length

  return {
    apartmentTitle: 'TULASIVANAM A-BLOCK',
    billingMonth: '2026-10',
    monthLabel: 'OCT-2026',
    rows: computedRows,
    totalAmount,
    totalWaterUsed,
    totalTankerAmt,
    flatsWithExcessCount,
    config: LATEST_OCT_2026_CONFIG,
  }
}
