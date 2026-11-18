'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Flat, Bill, Payment, Expense, Complaint, Notification } from '@/types'
import { authAPI, flatsAPI, expensesAPI, committeeAPI, bankAPI, adminAPI, billsAPI, paymentsAPI, complaintsAPI, notificationsAPI, residentAPI } from '@/lib/api'

interface AppState {
  // Auth & Roles
  isAuthenticated: boolean
  authToken: string | null
  userRole: 'admin' | 'resident' | null
  residentProfile: {
    id: string
    name: string
    email: string
    phoneNumber?: string
    flatNumber: string
    role: 'owner' | 'tenant'
    flatId: string
    apartmentId: string
    apartmentName?: string
    societyCode?: string
  } | null
  setAuthToken: (token: string | null) => void
  login: (email: string, password: string) => Promise<any>
  residentLogin: (emailOrFlat: string, password: string, societyCode?: string) => Promise<any>
  residentSignup: (data: any) => Promise<any>
  logout: () => void

  // Resident Portal State
  residentFlatData: any | null
  residentBills: any[]
  residentPayments: any[]
  residentComplaints: { raised: any[]; against: any[] }
  fetchResidentData: () => Promise<void>
  fetchResidentComplaints: () => Promise<void>
  submitResidentPayment: (data: Parameters<typeof residentAPI.submitPayment>[0]) => Promise<any>
  submitResidentComplaint: (data: Parameters<typeof residentAPI.submitComplaint>[0]) => Promise<any>

  // Admin Verification State
  pendingVerifications: any[]
  fetchPendingVerifications: () => Promise<void>
  verifyPayment: (id: string, action: 'approve' | 'reject', reason?: string) => Promise<void>

  // Loading & Error states
  isLoading: boolean
  error: string | null
  setError: (error: string | null) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Flats
  flats: Flat[]
  fetchFlats: () => Promise<void>
  addFlat: (flat: Flat) => Promise<void>
  updateFlat: (id: string, updates: Partial<Flat>) => Promise<void>
  deleteFlat: (id: string) => Promise<void>

  // Bills
  bills: Bill[]
  fetchBills: (params?: { billingMonth?: string; status?: string }) => Promise<void>
  addBill: (bill: Partial<Bill>) => Promise<Bill>
  updateBill: (id: string, updates: Partial<Bill>) => Promise<void>
  deleteBill: (id: string) => Promise<void>
  generateBills: (params: { billingMonth: string; amount: number; dueDayOfMonth?: number }) => Promise<void>
  bulkImportBills: (data: Parameters<typeof billsAPI.bulkImport>[0]) => Promise<any>

  // Payments
  payments: Payment[]
  fetchPayments: (params?: { billingMonth?: string; status?: string }) => Promise<void>
  addPayment: (payment: { billId: string; paidAmount: number; paymentMethod: string; transactionId?: string; remarks?: string }) => Promise<void>

  // Expenses
  expenses: Expense[]
  fetchExpenses: () => Promise<void>
  addExpense: (expense: Expense) => Promise<void>
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>

  // Complaints
  complaints: Complaint[]
  fetchComplaints: (params?: { status?: string; priority?: string }) => Promise<void>
  addComplaint: (complaint: Partial<Complaint>) => Promise<void>
  updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<void>
  deleteComplaint: (id: string) => Promise<void>

  // Notifications
  notifications: Notification[]
  fetchNotifications: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  unreadCount: () => number

  // Profile
  apartmentName: string
  apartmentId: string
  societyCode: string
  fetchProfile: () => Promise<void>
}

type FlatLike = Record<string, unknown>

// Map API response (nested owner/renter) back to frontend Flat shape
function fromFlatApiResponse(f: Record<string, unknown>): Flat {
  const owner = (f.owner ?? {}) as Record<string, string>
  const renter = (f.renter ?? {}) as Record<string, string>
  const rawType = f.occupationType as string | undefined
  return {
    id: (f._id ?? f.id) as string,
    flatNumber: f.flatNumber as string,
    floor: (f.floorNumber ?? f.floor ?? 0) as number,
    ownerName: owner.name ?? '',
    ownerMobile: owner.phoneNumber ?? '',
    ownerEmail: owner.email ?? '',
    occupancyStatus: (f.status ?? 'vacant') as 'occupied' | 'vacant',
    occupancyType: rawType === 'rented' ? 'tenant' : 'owner',
    tenantName: renter.name,
    tenantMobile: renter.phoneNumber,
    tenantEmail: renter.email,
    createdAt: f.createdAt as string,
  }
}

// Normalize API expense response to frontend Expense shape
function fromExpenseApiResponse(e: Record<string, unknown>): import('@/types').Expense {
  const month = (e.month as number) ?? 1
  const year = (e.year as number) ?? new Date().getFullYear()
  const mm = String(month).padStart(2, '0')
  const paymentStatus = e.paymentStatus as string | undefined
  return {
    id: (e._id ?? e.id) as string,
    category: e.category as import('@/types').ExpenseCategory,
    description: e.description as string,
    amount: e.amount as number,
    date: `${year}-${mm}-01`,
    status: paymentStatus === 'paid' ? 'paid' : 'unpaid',
    paidBy: e.paidBy as import('@/types').ExpensePaidBy | undefined,
    remarks: e.remarks as string | undefined,
  }
}

// Transform flat from frontend shape to model shape
// Actual model enums: occupationType = 'owner'|'rented', owner.phoneNumber, status = 'occupied'|'vacant'
function toFlatApiPayload(flat: FlatLike, apartmentId: string) {
  const rawType = flat.occupancyType as string | undefined
  const occupationType = (rawType === 'tenant' ? 'rented' : 'owner') as 'owner' | 'rented'
  return {
    flatNumber: flat.flatNumber as string,
    apartmentId,
    floorNumber: (flat.floor ?? flat.floorNumber ?? 0) as number,
    status: (flat.occupancyStatus || flat.status || 'vacant') as 'vacant' | 'occupied',
    occupationType,
    owner: flat.ownerName
      ? {
          name: flat.ownerName as string,
          phoneNumber: flat.ownerMobile as string,
          email: flat.ownerEmail as string,
        }
      : undefined,
    renter: rawType === 'tenant' && flat.tenantName
      ? {
          name: flat.tenantName as string,
          phoneNumber: flat.tenantMobile as string,
          email: flat.tenantEmail as string,
        }
      : undefined,
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth & Roles
      isAuthenticated: false,
      authToken: null,
      userRole: null,
      residentProfile: null,
      residentFlatData: null,
      residentBills: [],
      residentPayments: [],
      residentComplaints: { raised: [], against: [] },
      pendingVerifications: [],

      setAuthToken: (token) => set({ authToken: token, isAuthenticated: !!token }),
      login: async (email, password) => {
        try {
          set({ isLoading: true, error: null })
          const response = await authAPI.login({ email, password })
          const token = response.token || response.data?.token
          if (token) {
            const adminData = response.data?.admin || response.admin
            const aptId = adminData?.apartmentId
            const aptName = adminData?.apartmentName || adminData?.apartment?.apartmentName
            const code = adminData?.societyCode || adminData?.apartment?.societyCode
            set({
              authToken: token,
              isAuthenticated: true,
              userRole: 'admin',
              residentProfile: null,
              ...(aptId ? { apartmentId: String(aptId) } : {}),
              ...(aptName ? { apartmentName: aptName } : {}),
              societyCode: code || '',
            })
            return response
          } else {
            throw new Error('No token received')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed'
          set({ error: errorMessage, isAuthenticated: false })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      residentLogin: async (emailOrFlat, password, societyCode) => {
        try {
          set({ isLoading: true, error: null })
          const response = await authAPI.residentLogin({ emailOrFlat, password, societyCode })
          const token = response.token || response.data?.token
          const resident = response.data?.resident || response.resident
          if (token && resident) {
            set({
              authToken: token,
              isAuthenticated: true,
              userRole: 'resident',
              residentProfile: resident,
              apartmentId: resident.apartmentId ? String(resident.apartmentId) : '',
              apartmentName: resident.apartmentName || 'Apartment Society',
              societyCode: resident.societyCode || '',
            })
            return response
          }
          throw new Error('Resident login failed')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Resident login failed'
          set({ error: errorMessage, isAuthenticated: false })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      residentSignup: async (data) => {
        try {
          set({ isLoading: true, error: null })
          const response = await authAPI.residentSignup(data)
          const token = response.token || response.data?.token
          const resident = response.data?.resident || response.resident
          if (token && resident) {
            set({
              authToken: token,
              isAuthenticated: true,
              userRole: 'resident',
              residentProfile: resident,
              apartmentId: resident.apartmentId ? String(resident.apartmentId) : '',
              apartmentName: resident.apartmentName || 'Apartment Society',
              societyCode: resident.societyCode || '',
            })
            return response
          }
          throw new Error('Resident signup failed')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Resident signup failed'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      fetchResidentData: async () => {
        try {
          set({ isLoading: true })
          const [flatRes, billsRes, paymentsRes, complaintsRes] = await Promise.all([
            residentAPI.getMyFlat().catch(() => null),
            residentAPI.getMyBills().catch(() => ({ data: [] })),
            residentAPI.getMyPayments().catch(() => ({ data: [] })),
            residentAPI.getMyComplaints().catch(() => null),
          ])
          set({
            residentFlatData: flatRes?.data || null,
            residentBills: billsRes?.data || [],
            residentPayments: paymentsRes?.data || [],
            residentComplaints: {
              raised: complaintsRes?.data?.raised || [],
              against: complaintsRes?.data?.against || [],
            },
          })
        } catch (err) {
          console.error('Failed to fetch resident data:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      submitResidentPayment: async (data) => {
        try {
          set({ isLoading: true })
          const res = await residentAPI.submitPayment(data)
          await get().fetchResidentData()
          return res
        } catch (err) {
          throw err
        } finally {
          set({ isLoading: false })
        }
      },

      fetchResidentComplaints: async () => {
        const res = await residentAPI.getMyComplaints()
        set({
          residentComplaints: {
            raised: res?.data?.raised || [],
            against: res?.data?.against || [],
          },
        })
      },

      submitResidentComplaint: async (data) => {
        const res = await residentAPI.submitComplaint(data)
        await get().fetchResidentComplaints()
        return res
      },

      fetchPendingVerifications: async () => {
        try {
          const res = await paymentsAPI.getPendingVerifications()
          set({ pendingVerifications: res.data || res || [] })
        } catch (err) {
          console.error('Failed to fetch pending verifications:', err)
        }
      },

      verifyPayment: async (id, action, reason) => {
        try {
          await paymentsAPI.verifyPayment(id, { action, rejectionReason: reason })
          await Promise.all([
            get().fetchPendingVerifications(),
            get().fetchPayments(),
            get().fetchBills(),
            get().fetchFlats(),
          ])
        } catch (err) {
          throw err
        }
      },

      logout: () => set({
        isAuthenticated: false,
        authToken: null,
        userRole: null,
        residentProfile: null,
        residentFlatData: null,
        residentBills: [],
        residentPayments: [],
        residentComplaints: { raised: [], against: [] },
        pendingVerifications: [],
        apartmentName: '',
        apartmentId: '',
        societyCode: '',
        flats: [],
        expenses: [],
        bills: [],
        payments: [],
        complaints: [],
        notifications: [],
      }),

      // Loading & Error
      isLoading: false,
      error: null,
      setError: (error) => set({ error }),

      // Profile
      apartmentName: '',
      apartmentId: '',
      societyCode: '',
      fetchProfile: async () => {
        try {
          const response = await adminAPI.getProfile()
          const admin = response.data || response
          const rawAptId = admin?.apartmentId
          const aptId = typeof rawAptId === 'object' ? rawAptId?._id : rawAptId
          const name = (typeof rawAptId === 'object' ? rawAptId?.apartmentName : '') || ''
          const code = (typeof rawAptId === 'object' ? rawAptId?.societyCode : '') || ''
          if (name) set({ apartmentName: name })
          if (aptId) set({ apartmentId: aptId })
          // Always overwrite: keeping a previous admin's code (persisted in localStorage) shows the wrong society
          set({ societyCode: code })
        } catch (_) {}
      },

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Flats
      flats: [],
      fetchFlats: async () => {
        try {
          set({ isLoading: true, error: null })
          const response = await flatsAPI.list()
          const flatsData = response.data || response
          const mapped = Array.isArray(flatsData) ? flatsData.map(fromFlatApiResponse) : []
          set({ flats: mapped })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch flats'
          set({ error: errorMessage })
        } finally {
          set({ isLoading: false })
        }
      },
      addFlat: async (flat) => {
        try {
          set({ isLoading: true, error: null })
          let { apartmentId } = get()
          if (!apartmentId) {
            await get().fetchProfile()
            apartmentId = get().apartmentId
          }
          const apiPayload = toFlatApiPayload(flat as unknown as FlatLike, apartmentId)
          const response = await flatsAPI.create(apiPayload)
          const newFlat = fromFlatApiResponse(response.data || response)
          set((s) => ({ flats: [...s.flats, newFlat] }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add flat'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      updateFlat: async (id, updates) => {
        try {
          set({ isLoading: true, error: null })
          let { apartmentId } = get()
          if (!apartmentId) {
            await get().fetchProfile()
            apartmentId = get().apartmentId
          }
          const apiPayload = toFlatApiPayload(updates as unknown as FlatLike, apartmentId)
          const response = await flatsAPI.update(id, apiPayload)
          const updatedFlat = response.data || response
          set((s) => ({ flats: s.flats.map((f) => (f.id === id || (f as any)._id === id ? { ...f, ...updatedFlat } : f)) }))
          return updatedFlat
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update flat'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      deleteFlat: async (id) => {
        try {
          set({ isLoading: true, error: null })
          await flatsAPI.delete(id)
          set((s) => ({ flats: s.flats.filter((f) => f.id !== id && (f as any)._id !== id) }))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete flat'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      // Bills
      bills: [],
      fetchBills: async (params) => {
        try {
          set({ isLoading: true, error: null })
          const response = await billsAPI.list(params)
          const data = response.data || response
          set({ bills: Array.isArray(data) ? data : [] })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch bills' })
        } finally {
          set({ isLoading: false })
        }
      },
      addBill: async (bill) => {
        try {
          set({ isLoading: true, error: null })
          const response = await billsAPI.create(bill as { flatId: string; billingMonth: string; amount: number; dueDate?: string })
          const newBill = response.data || response
          set((s) => ({ bills: [newBill, ...s.bills] }))
          return newBill
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create bill' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      updateBill: async (id, updates) => {
        try {
          set({ isLoading: true, error: null })
          const response = await billsAPI.update(id, updates)
          const updated = response.data || response
          set((s) => ({ bills: s.bills.map((b) => ((b as any)._id === id || b.id === id ? { ...b, ...updated } : b)) }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update bill' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      deleteBill: async (id) => {
        try {
          set({ isLoading: true, error: null })
          await billsAPI.delete(id)
          set((s) => ({ bills: s.bills.filter((b) => (b as any)._id !== id && b.id !== id) }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete bill' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      generateBills: async (params) => {
        try {
          set({ isLoading: true, error: null })
          const response = await billsAPI.generate(params)
          const newBills = response.data || []
          if (Array.isArray(newBills) && newBills.length > 0) {
            set((s) => ({ bills: [...newBills, ...s.bills] }))
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to generate bills' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      bulkImportBills: async (data) => {
        try {
          set({ isLoading: true, error: null })
          let { apartmentId } = get()
          if (!apartmentId) {
            await get().fetchProfile()
            apartmentId = get().apartmentId
          }
          const response = await billsAPI.bulkImport({ ...data, apartmentId: data.apartmentId || apartmentId })
          await Promise.all([get().fetchBills(), get().fetchFlats()])
          return response
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to import bills' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      // Payments
      payments: [],
      fetchPayments: async (params) => {
        try {
          set({ isLoading: true, error: null })
          const response = await paymentsAPI.list(params)
          const data = response.data || response
          set({ payments: Array.isArray(data) ? data : [] })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch payments' })
        } finally {
          set({ isLoading: false })
        }
      },
      addPayment: async (payment) => {
        try {
          set({ isLoading: true, error: null })
          const response = await paymentsAPI.create(payment)
          const newPayment = response.data || response
          set((s) => ({ payments: [newPayment, ...s.payments] }))
          // Refresh bills and flats to reflect updated payment status and cleared dues
          await Promise.all([get().fetchBills(), get().fetchFlats()])
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to record payment' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      // Expenses
      expenses: [],
      fetchExpenses: async () => {
        try {
          set({ isLoading: true, error: null })
          const response = await expensesAPI.list()
          const expensesData = response.data || response
          const mapped = Array.isArray(expensesData) ? expensesData.map(fromExpenseApiResponse) : []
          set({ expenses: mapped })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch expenses' })
        } finally {
          set({ isLoading: false })
        }
      },
      addExpense: async (expense) => {
        try {
          set({ isLoading: true, error: null })
          let { apartmentId } = get()
          if (!apartmentId) {
            await get().fetchProfile()
            apartmentId = get().apartmentId
          }
          // Transform date string to month/year integers as required by the API
          const dateStr = expense.date || ''
          const dateObj = dateStr ? new Date(dateStr) : new Date()
          const apiPayload = {
            apartmentId,
            category: expense.category,
            description: expense.description,
            amount: expense.amount,
            month: dateObj.getMonth() + 1,
            year: dateObj.getFullYear(),
            paymentStatus: expense.status === 'paid' ? 'paid' : 'pending',
            paidBy: expense.paidBy || 'apartment',
            remarks: expense.remarks,
          }
          const response = await expensesAPI.create(apiPayload)
          const newExpense = fromExpenseApiResponse(response.data || response)
          set((s) => ({ expenses: [...s.expenses, newExpense] }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to add expense' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      updateExpense: async (id, updates) => {
        try {
          set({ isLoading: true, error: null })
          const response = await expensesAPI.update(id, updates)
          const updatedExpense = fromExpenseApiResponse(response.data || response)
          set((s) => ({ expenses: s.expenses.map((e) => (e.id === id || (e as any)._id === id ? updatedExpense : e)) }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update expense' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      deleteExpense: async (id) => {
        try {
          set({ isLoading: true, error: null })
          await expensesAPI.delete(id)
          set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id && (e as any)._id !== id) }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete expense' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      // Complaints
      complaints: [],
      fetchComplaints: async (params) => {
        try {
          set({ isLoading: true, error: null })
          const response = await complaintsAPI.list(params)
          const data = response.data || response
          set({ complaints: Array.isArray(data) ? data : [] })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch complaints' })
        } finally {
          set({ isLoading: false })
        }
      },
      addComplaint: async (complaint) => {
        try {
          set({ isLoading: true, error: null })
          const response = await complaintsAPI.create(complaint as unknown as Parameters<typeof complaintsAPI.create>[0])
          const newComplaint = response.data || response
          set((s) => ({ complaints: [newComplaint, ...s.complaints] }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to file complaint' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      updateComplaint: async (id, updates) => {
        try {
          set({ isLoading: true, error: null })
          const response = await complaintsAPI.update(id, updates as Parameters<typeof complaintsAPI.update>[1])
          const updated = response.data || response
          set((s) => ({ complaints: s.complaints.map((c) => ((c as any)._id === id || c.id === id ? { ...c, ...updated } : c)) }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update complaint' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      deleteComplaint: async (id) => {
        try {
          set({ isLoading: true, error: null })
          await complaintsAPI.delete(id)
          set((s) => ({ complaints: s.complaints.filter((c) => (c as any)._id !== id && c.id !== id) }))
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete complaint' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      // Notifications
      notifications: [],
      fetchNotifications: async () => {
        try {
          const response = await notificationsAPI.list()
          const data = response.data || response
          set({ notifications: Array.isArray(data) ? data : [] })
        } catch (_) {}
      },
      markNotificationRead: async (id) => {
        try {
          await notificationsAPI.markRead(id)
          set((s) => ({ notifications: s.notifications.map((n) => ((n as any)._id === id || n.id === id ? { ...n, read: true, isRead: true } : n)) }))
        } catch (_) {}
      },
      markAllNotificationsRead: async () => {
        try {
          await notificationsAPI.markAllRead()
          set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true, isRead: true })) }))
        } catch (_) {}
      },
      unreadCount: () => get().notifications.filter((n) => !(n as any).isRead && !n.read).length,
    }),
    {
      name: 'apartment-app-storage',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated, authToken: state.authToken, sidebarOpen: state.sidebarOpen, apartmentId: state.apartmentId, apartmentName: state.apartmentName, societyCode: state.societyCode }),
    }
  )
)
