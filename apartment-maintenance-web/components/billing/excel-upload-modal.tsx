'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Upload, FileSpreadsheet, Download, Printer, CheckCircle2,
  RefreshCw, FileText, X, Settings2, Sliders, Calculator, ChevronDown, ChevronUp, Info
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import {
  parseUploadedFile,
  recalculateRows,
  getLatestOct2026Result,
  LATEST_OCT_2026_CONFIG,
  type ParseResult,
  type CalculationConfig,
} from '@/lib/excelParser'
import { downloadMaintenancePDF, openPrintWindow } from '@/lib/pdfGenerator'
import { formatCurrency, formatMonth } from '@/lib/utils'

interface ExcelUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ExcelUploadModal({ open, onOpenChange, onSuccess }: ExcelUploadModalProps) {
  const { bulkImportBills, apartmentName } = useAppStore()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [parsedData, setParsedData] = useState<ParseResult | null>(null)
  const [billingMonth, setBillingMonth] = useState('2026-10')
  const [customTitle, setCustomTitle] = useState('TULASIVANAM A-BLOCK OCT-2026 MAINTENANCE SHEET')
  const [searchQuery, setSearchQuery] = useState('')

  // Multi-section / month selector
  const [availableSections, setAvailableSections] = useState<{ label: string; billingMonth: string; result: ParseResult }[]>([])
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<string>('0')

  // Calculation parameters
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<CalculationConfig>(LATEST_OCT_2026_CONFIG)
  const [autoRecalc, setAutoRecalc] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset all modal state to clean slate
  function resetModalState() {
    setParsedData(null)
    setLoading(false)
    setUpdating(false)
    setDownloading(false)
    setSearchQuery('')
    setAvailableSections([])
    setSelectedSectionIdx('0')
    setShowConfig(false)
    setConfig(LATEST_OCT_2026_CONFIG)
    setBillingMonth('2026-10')
    setCustomTitle('TULASIVANAM A-BLOCK OCT-2026 MAINTENANCE SHEET')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Clear modal data whenever modal closes or is dismissed
  useEffect(() => {
    if (!open) {
      resetModalState()
    }
  }, [open])

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      resetModalState()
    }
    onOpenChange(isOpen)
  }

  // Handle uploaded file or dropped file
  async function processFile(selected: File) {
    setLoading(true)
    try {
      const result = await parseUploadedFile(selected, billingMonth)
      setParsedData(result)

      if (result.allSections && result.allSections.length > 0) {
        setAvailableSections(result.allSections)
        setSelectedSectionIdx('0')
      }

      if (result.config) {
        setConfig(result.config)
      }

      setBillingMonth(result.billingMonth)
      setCustomTitle(`${result.apartmentTitle || apartmentName || 'TULASIVANAM A-BLOCK'} ${result.monthLabel || result.billingMonth} MAINTENANCE SHEET`.toUpperCase())

      toast({
        title: 'File Parsed Successfully',
        description: `Loaded ${result.rows.length} flats across ${result.allSections?.length || 1} monthly section(s).`,
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Failed to Parse File',
        description: err instanceof Error ? err.message : 'Invalid file format',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) {
      processFile(selected)
    }
  }

  // Load Latest October 2026 (exact readings and amounts from the PDF)
  function handleLoadLatestOct() {
    const octResult = getLatestOct2026Result()
    octResult.apartmentTitle = apartmentName || 'TULASIVANAM A-BLOCK'
    setParsedData(octResult)
    setConfig(LATEST_OCT_2026_CONFIG)
    setBillingMonth('2026-10')
    setCustomTitle('TULASIVANAM A-BLOCK OCT-2026 MAINTENANCE SHEET')
    setAvailableSections([])
    toast({
      title: 'Latest October 2026 Loaded',
      description: 'Loaded exact October readings & calculations from the PDF (G1: ₹1,924, A-105: ₹1,806, A-106: ₹4,955, Others: ₹1,360).',
      variant: 'success',
    })
  }

  // Switch between monthly sections detected in the uploaded file
  function handleSectionChange(idxStr: string) {
    setSelectedSectionIdx(idxStr)
    const idx = parseInt(idxStr, 10)
    const section = availableSections[idx]
    if (section) {
      const res = section.result
      setParsedData(res)
      if (res.config) setConfig(res.config)
      setBillingMonth(res.billingMonth)
      setCustomTitle(`TULASIVANAM A-BLOCK ${res.monthLabel} MAINTENANCE SHEET`.toUpperCase())
    }
  }

  // Re-run calculations when config changes
  function applyCalculation(newConfig: CalculationConfig) {
    if (!parsedData) return
    setConfig(newConfig)
    const { rows, totalAmount, totalWaterUsed, totalTankerAmt, flatsWithExcessCount } = recalculateRows(parsedData.rows, newConfig)
    setParsedData({
      ...parsedData,
      rows,
      totalAmount,
      totalWaterUsed,
      totalTankerAmt,
      flatsWithExcessCount,
      config: newConfig,
    })
    toast({
      title: 'Calculations Updated',
      description: `Recalculated with Exemption ${newConfig.manjeeraExemptLimit.toLocaleString('en-IN')}L, Tanker Rate ₹${newConfig.tankerRate}, Pvt Rate ₹${newConfig.pvtTankerRate}.`,
    })
  }

  // Action: Update Amount to All Flats in Database
  async function handleUpdateAmounts() {
    if (!parsedData || parsedData.rows.length === 0) return

    setUpdating(true)
    try {
      const payloadBills = parsedData.rows.map((r) => ({
        flatNumber: r.flatNumber,
        amount: r.totalAmount,
        waterUsed: r.waterUsed,
        meterStart: r.meterStart,
        meterEnd: r.meterEnd,
        manjeeraTankerAmt: r.manjeeraTankerAmt,
        pvtTankerAmt: r.pvtTankerAmt,
        hmwssbBill: r.hmwssbBill,
        commonMaint: r.commonMaint,
        remarks: `Water: ${r.waterUsed || 0}L | Tanker: ₹${r.manjeeraTankerAmt + r.pvtTankerAmt} | Common: ₹${r.commonMaint} | HMWSSB: ₹${r.hmwssbBill}`,
      }))

      await bulkImportBills({
        billingMonth,
        bills: payloadBills,
        dueDayOfMonth: 10,
      })

      toast({
        title: 'All Flats Updated Successfully!',
        description: `Updated bills and maintenance dues for all ${parsedData.rows.length} flats for ${formatMonth(billingMonth)}. Residents will now pay according to this sheet.`,
        variant: 'success',
      })

      resetModalState()
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update amounts in database.'
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        toast({
          title: 'Backend Server Restart Needed',
          description: 'Please restart your backend server terminal (press Ctrl+C in backend terminal, then run npm run dev) so Express loads the new /api/bills/bulk-import route.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Update Failed',
          description: msg,
          variant: 'destructive',
        })
      }
    } finally {
      setUpdating(false)
    }
  }

  // Action: Generate & Download PDF
  async function handleDownloadPDF() {
    if (!parsedData) return
    setDownloading(true)
    try {
      await downloadMaintenancePDF(parsedData, customTitle)
      toast({
        title: 'PDF Generated',
        description: 'Downloaded maintenance collection signature sheet and breakdown table.',
        variant: 'success',
      })
    } catch {
      toast({ title: 'Notice', description: 'Opening print dialog to print or save as PDF.' })
    } finally {
      setDownloading(false)
    }
  }

  // Action: Print Window
  function handlePrint() {
    if (!parsedData) return
    openPrintWindow(parsedData, customTitle)
  }

  const filteredRows = parsedData?.rows.filter((r) =>
    searchQuery ? r.flatNumber.toLowerCase().includes(searchQuery.toLowerCase()) : true
  ) || []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Maintenance & Water Meter Sheet
                </DialogTitle>
                <DialogDescription>
                  Upload your Excel sheet or select a month to calculate water usage, tanker dues, and generate the signature collection PDF.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {parsedData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetModalState}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear Data
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadLatestOct}
                className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                Latest Oct 2026 (Preset)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                {parsedData ? 'Upload New Sheet' : 'Upload XLSX/CSV'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-700">Reading and processing Excel spreadsheet...</p>
            </div>
          )}

          {!loading && !parsedData && (
            <div className="py-2 space-y-5">
              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const dropped = e.dataTransfer.files?.[0]
                  if (dropped) processFile(dropped)
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/50 transition-all rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="h-14 w-14 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-sm">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">
                  Click to upload or drag and drop your spreadsheet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-4">
                  Supports Excel files (<code className="text-indigo-600 font-medium">.xlsx</code>, <code className="text-indigo-600 font-medium">.xls</code>) and <code className="text-indigo-600 font-medium">.csv</code> with flat meter readings & maintenance calculations.
                </p>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 pointer-events-none text-xs">
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Select Excel File
                </Button>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs mb-1">
                    <Calculator className="h-4 w-4" />
                    <span>Auto Multiplier & Usage</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Automatically computes (End Rdg − Start Rdg) × 10 for all units (1x for A-105).
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs mb-1">
                    <Sliders className="h-4 w-4" />
                    <span>Dynamic Tanker Slabs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Applies Manjeera tanker exemption limits and private tanker excess rates accurately.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs mb-1">
                    <Printer className="h-4 w-4" />
                    <span>Signature PDF & Sync</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Generates 2-column signature sheets and updates all flats in database in one click.
                  </p>
                </div>
              </div>

              {/* Quick Preset Link */}
              <div className="flex items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600">
                <span>Want to preview sample calculations first?</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleLoadLatestOct}
                  className="text-xs text-indigo-600 font-semibold ml-1 p-0 h-auto hover:text-indigo-800"
                >
                  Load October 2026 Preset &rarr;
                </Button>
              </div>
            </div>
          )}

          {!loading && parsedData && (
            <>
              {/* Context Selector Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                {/* Available Sections Dropdown (when multiple months in file) */}
                {availableSections.length > 1 && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Month Section in File</Label>
                    <Select value={selectedSectionIdx} onValueChange={handleSectionChange}>
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSections.map((sec, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {sec.label} ({sec.billingMonth})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Billing Month</Label>
                  <Input
                    type="month"
                    value={billingMonth}
                    onChange={(e) => {
                      setBillingMonth(e.target.value)
                      setCustomTitle(`TULASIVANAM A-BLOCK ${formatMonth(e.target.value)} MAINTENANCE SHEET`.toUpperCase())
                    }}
                    className="h-9 bg-white text-xs"
                  />
                </div>

                <div className={`space-y-1 ${availableSections.length > 1 ? '' : 'sm:col-span-2'}`}>
                  <Label className="text-xs font-semibold text-slate-600">PDF Document Title</Label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. TULASIVANAM A-BLOCK OCT-2026 MAINTENANCE SHEET"
                    className="h-9 bg-white text-xs"
                  />
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <p className="text-xs text-slate-500">Total Flats</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{parsedData.rows.length} Units</p>
                  <span className="text-[11px] text-slate-400">G1–G7 & A101–A407</span>
                </div>
                <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 shadow-sm">
                  <p className="text-xs text-indigo-600">Total Maintenance</p>
                  <p className="text-lg font-bold text-indigo-700 mt-0.5">{formatCurrency(parsedData.totalAmount)}</p>
                  <span className="text-[11px] text-indigo-500">Collection target</span>
                </div>
                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm">
                  <p className="text-xs text-blue-600">Total Water Consumed</p>
                  <p className="text-lg font-bold text-blue-700 mt-0.5">{parsedData.totalWaterUsed.toLocaleString('en-IN')} L</p>
                  <span className="text-[11px] text-blue-500">All flats combined</span>
                </div>
                <div className="p-3 rounded-xl border border-red-100 bg-red-50/50 shadow-sm">
                  <p className="text-xs text-red-600">Excess Tanker Charges</p>
                  <p className="text-lg font-bold text-red-700 mt-0.5">
                    {parsedData.flatsWithExcessCount} Flats ({formatCurrency(parsedData.totalTankerAmt)})
                  </p>
                  <span className="text-[11px] text-red-500">Above free exemption</span>
                </div>
              </div>

              {/* Calculation Settings Accordion */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="w-full flex items-center justify-between p-3 px-4 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-xs font-semibold text-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-indigo-600" />
                    Calculation Rules & Rates ({billingMonth.includes('2026-10') ? 'October 2026 Rules' : 'Sheet Rules'})
                  </span>
                  <div className="flex items-center gap-3 text-slate-500 font-normal">
                    <span>Exempt: {config.manjeeraExemptLimit.toLocaleString('en-IN')}L</span>
                    <span>Tanker: ₹{config.tankerRate}</span>
                    <span>Pvt: ₹{config.pvtTankerRate}</span>
                    {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {showConfig && (
                  <div className="p-4 border-t border-slate-200 space-y-3 bg-white text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Free Exemption (L)</Label>
                        <Input
                          type="number"
                          value={config.manjeeraExemptLimit}
                          onChange={(e) => applyCalculation({ ...config, manjeeraExemptLimit: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Manjeera Tanker Cap (L)</Label>
                        <Input
                          type="number"
                          value={config.manjeeraTankerExemptLimit}
                          onChange={(e) => applyCalculation({ ...config, manjeeraTankerExemptLimit: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Tanker Rate (₹/L)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={config.tankerRate}
                          onChange={(e) => applyCalculation({ ...config, tankerRate: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Pvt Tanker Rate (₹/L)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={config.pvtTankerRate}
                          onChange={(e) => applyCalculation({ ...config, pvtTankerRate: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">HMWSSB Bill / Flat (₹)</Label>
                        <Input
                          type="number"
                          value={config.hmwssbBill}
                          onChange={(e) => applyCalculation({ ...config, hmwssbBill: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-500">Common Maint (₹)</Label>
                        <Input
                          type="number"
                          value={config.commonMaint}
                          onChange={(e) => applyCalculation({ ...config, commonMaint: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Info className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Formula: Base = ₹{config.hmwssbBill + config.commonMaint} (HMWSSB ₹{config.hmwssbBill} + Common ₹{config.commonMaint}). Water over {config.manjeeraExemptLimit.toLocaleString('en-IN')}L is charged @ ₹{config.tankerRate}/L (first {config.manjeeraTankerExemptLimit.toLocaleString('en-IN')}L) and ₹{config.pvtTankerRate}/L thereafter.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => applyCalculation(LATEST_OCT_2026_CONFIG)}
                          className="h-7 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Reset to Latest Oct 2026 Rules
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Table Toolbar & Search */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search flat (e.g. G1, A-106)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-56 h-8 text-xs bg-white"
                  />
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="h-8 px-2 text-xs">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Excess Water Charged
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Standard Base (₹{config.hmwssbBill + config.commonMaint})
                  </span>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Flat No</th>
                      <th className="px-3 py-2 text-center font-semibold">Meter</th>
                      <th className="px-3 py-2 text-center font-semibold">Start Rdg</th>
                      <th className="px-3 py-2 text-center font-semibold">End Rdg</th>
                      <th className="px-3 py-2 text-right font-semibold">Water Used</th>
                      <th className="px-3 py-2 text-right font-semibold">Tanker Used</th>
                      <th className="px-3 py-2 text-right font-semibold">Manjeera ₹</th>
                      <th className="px-3 py-2 text-right font-semibold">Pvt ₹</th>
                      <th className="px-3 py-2 text-right font-semibold">HMWSSB</th>
                      <th className="px-3 py-2 text-right font-semibold">Common</th>
                      <th className="px-3 py-2 text-right font-bold text-slate-900 bg-indigo-50/60">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((r) => {
                      const hasExcess = r.manjeeraTankerAmt > 0 || r.pvtTankerAmt > 0
                      return (
                        <tr key={r.flatNumber} className={`hover:bg-slate-50/60 ${hasExcess ? 'bg-red-50/30' : ''}`}>
                          <td className="px-3 py-2 font-bold text-slate-900 flex items-center gap-1.5">
                            {r.flatNumber}
                            {hasExcess && (
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Excess tanker water charges" />
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-500">{r.newMeter || 'New'}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{r.meterStart?.toLocaleString('en-IN') || '—'}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{r.meterEnd?.toLocaleString('en-IN') || '—'}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${hasExcess ? 'text-red-600' : 'text-slate-700'}`}>
                            {(r.waterUsed || 0).toLocaleString('en-IN')} L
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">
                            {r.totalTankerUsage > 0 ? `${r.totalTankerUsage.toLocaleString('en-IN')} L` : '0'}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 font-medium">
                            {r.manjeeraTankerAmt > 0 ? `₹${r.manjeeraTankerAmt.toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 font-medium">
                            {r.pvtTankerAmt > 0 ? `₹${r.pvtTankerAmt.toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">₹{r.hmwssbBill}</td>
                          <td className="px-3 py-2 text-right text-slate-600">₹{r.commonMaint}</td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-700 bg-indigo-50/30">
                            ₹{r.totalAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Close
          </Button>

          {parsedData && (
            <div className="flex items-center gap-2">
              {/* Print / Save PDF button */}
              <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-slate-600" />
                Print Signature Sheet
              </Button>

              {/* Direct Download PDF button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex items-center gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Generating PDF...' : 'Download PDF'}
              </Button>

              {/* Primary Action: Update Amounts to All Flats */}
              <Button
                size="sm"
                onClick={handleUpdateAmounts}
                disabled={updating}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                {updating ? 'Updating Database...' : `Update Amounts to All ${parsedData.rows.length} Flats`}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
