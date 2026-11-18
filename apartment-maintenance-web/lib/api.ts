// API Service Layer for Backend Communication
const getApiBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'
  // Remove any trailing slashes
  url = url.replace(/\/+$/, '')
  // Ensure /api suffix exists
  if (!url.endsWith('/api')) {
    url = `${url}/api`
  }
  return url
}

const API_BASE_URL = getApiBaseUrl()

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    const storage = localStorage.getItem('apartment-app-storage')
    if (storage) {
      try {
        const { state } = JSON.parse(storage)
        return state?.authToken
      } catch (e) {
        console.error('Error parsing auth token from storage:', e)
      }
    }
  }
  return null
}

// Helper function for API requests
const fetchApi = async <T = any>(
  endpoint: string,
  options: RequestInit & { requiresAuth?: boolean } = {}
): Promise<T> => {
  const { requiresAuth = true, ...fetchOptions } = options
  const url = `${API_BASE_URL}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  // Add auth token if required
  if (requiresAuth) {
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    if (response.status === 401 && requiresAuth) {
      // Handle unauthorized - clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('apartment-app-storage')
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }
    const errBody = await response.json().catch(() => null)
    throw new Error(errBody?.message || `API error: ${response.statusText}`)
  }

  return response.json()
}

// ==================== AUTH API ====================
export const authAPI = {
  signup: async (data: {
    firstName: string
    lastName: string
    email: string
    password: string
    phoneNumber?: string
    apartmentName: string
    address: {
      street: string
      city?: string
      state?: string
      pinCode: string
    }
    numberOfFlats: number
    numberOfFloors: number
  }) => {
    const response = await fetchApi<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: false,
    })
    return response
  },

  login: async (data: { email: string; password: string }) => {
    const response = await fetchApi<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: false,
    })
    return response
  },

  residentLogin: async (data: { emailOrFlat: string; password: string }) => {
    return fetchApi<any>('/auth/resident-login', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: false,
    })
  },

  residentSignup: async (data: {
    email: string
    password: string
    name: string
    phoneNumber?: string
    flatNumber: string
    role?: 'owner' | 'tenant'
  }) => {
    return fetchApi<any>('/auth/resident-signup', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: false,
    })
  },

  getMe: async () => {
    return fetchApi<any>('/auth/me', {
      method: 'GET',
    })
  },

  forgotPassword: async (email: string) => {
    return fetchApi<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      requiresAuth: false,
    })
  },

  resetPassword: async (token: string, password: string) => {
    return fetchApi<any>(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
      requiresAuth: false,
    })
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    return fetchApi<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    })
  },
}

// ==================== APARTMENTS API ====================
export const apartmentAPI = {
  list: async () => {
    return fetchApi<any[]>('/apartments', {
      method: 'GET',
    })
  },

  getById: async (id: string) => {
    return fetchApi<any>(`/apartments/${id}`, {
      method: 'GET',
    })
  },

  update: async (id: string, data: any) => {
    return fetchApi<any>(`/apartments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}

// ==================== FLATS API ====================
export const flatsAPI = {
  list: async () => {
    return fetchApi<any[]>('/flats', {
      method: 'GET',
    })
  },

  create: async (data: {
    flatNumber: string
    apartmentId: string
    floorNumber: number
    status?: 'vacant' | 'occupied'
    occupationType?: 'owner' | 'rented'
    owner?: { name?: string; phoneNumber?: string; email?: string }
    renter?: { name?: string; phoneNumber?: string; email?: string }
  }) => {
    return fetchApi<any>('/flats', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getById: async (id: string) => {
    return fetchApi<any>(`/flats/${id}`, {
      method: 'GET',
    })
  },

  update: async (id: string, data: {
    flatNumber?: string
    floorNumber?: number
    status?: 'vacant' | 'occupied'
    occupationType?: 'owner' | 'rented'
    owner?: { name?: string; phoneNumber?: string; email?: string }
    renter?: { name?: string; phoneNumber?: string; email?: string }
  }) => {
    return fetchApi<any>(`/flats/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  updateStatus: async (id: string, status: 'vacant' | 'occupied' | 'maintenance') => {
    return fetchApi<any>(`/flats/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  getShare: async (id: string) => {
    return fetchApi<any>(`/flats/${id}/share`, {
      method: 'GET',
    })
  },

  delete: async (id: string) => {
    return fetchApi<any>(`/flats/${id}`, {
      method: 'DELETE',
    })
  },
}

// ==================== EXPENSES API ====================
export const expensesAPI = {
  list: async () => {
    return fetchApi<any[]>('/expenses', {
      method: 'GET',
    })
  },

  getSummary: async () => {
    return fetchApi<any>('/expenses/summary', {
      method: 'GET',
    })
  },

  create: async (data: {
    apartmentId: string
    category?: string
    description?: string
    amount: number
    month: number
    year: number
    status?: 'paid' | 'unpaid'
  }) => {
    return fetchApi<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getById: async (id: string) => {
    return fetchApi<any>(`/expenses/${id}`, {
      method: 'GET',
    })
  },

  update: async (id: string, data: any) => {
    return fetchApi<any>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<any>(`/expenses/${id}`, {
      method: 'DELETE',
    })
  },
}

// ==================== COMMITTEE API ====================
export const committeeAPI = {
  list: async () => {
    return fetchApi<any>('/committee', {
      method: 'GET',
    })
  },

  create: async (data: {
    apartmentId: string
    flatId: string
    memberName: string
    phoneNumber: string
    email: string
    role: string
  }) => {
    return fetchApi<any>('/committee', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: Partial<{
    memberName: string
    phoneNumber: string
    email: string
    role: string
  }>) => {
    return fetchApi<any>(`/committee/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<any>(`/committee/${id}`, {
      method: 'DELETE',
    })
  },
}

// ==================== BANK DETAILS API ====================
export const bankAPI = {
  get: async () => {
    return fetchApi<any>('/bank', {
      method: 'GET',
    })
  },

  create: async (data: {
    bankName?: string
    accountNumber?: string
    ifscCode?: string
    accountHolderName?: string
    upiId?: string
  }) => {
    return fetchApi<any>('/bank', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<any>(`/bank/${id}`, {
      method: 'DELETE',
    })
  },
}

// ==================== ADMIN API ====================
export const adminAPI = {
  getProfile: async () => {
    return fetchApi<any>('/admin/me', {
      method: 'GET',
    })
  },

  updateProfile: async (data: {
    firstName?: string
    lastName?: string
    phoneNumber?: string
  }) => {
    return fetchApi<any>('/admin/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  addSurplus: async (data: { apartmentId: string; amount: number; memo?: string }) => {
    return fetchApi<any>('/admin/surplus', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ==================== BILLS API ====================
export const billsAPI = {
  list: async (params?: { billingMonth?: string; status?: string; flatId?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return fetchApi<any[]>(`/bills${qs}`, { method: 'GET' })
  },

  generate: async (data: { billingMonth: string; amount: number; dueDayOfMonth?: number }) => {
    return fetchApi<any>('/bills/generate', { method: 'POST', body: JSON.stringify(data) })
  },

  bulkImport: async (data: {
    billingMonth: string
    bills: Array<{
      flatNumber: string
      amount: number
      ownerName?: string
      waterUsed?: number
      meterStart?: number
      meterEnd?: number
      manjeeraTankerAmt?: number
      pvtTankerAmt?: number
      hmwssbBill?: number
      commonMaint?: number
      remarks?: string
    }>
    dueDayOfMonth?: number
    apartmentId?: string
  }) => {
    return fetchApi<any>('/bills/bulk-import', { method: 'POST', body: JSON.stringify(data) })
  },

  create: async (data: { flatId: string; billingMonth: string; amount: number; dueDate?: string }) => {
    return fetchApi<any>('/bills', { method: 'POST', body: JSON.stringify(data) })
  },

  getById: async (id: string) => {
    return fetchApi<any>(`/bills/${id}`, { method: 'GET' })
  },

  update: async (id: string, data: any) => {
    return fetchApi<any>(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  delete: async (id: string) => {
    return fetchApi<any>(`/bills/${id}`, { method: 'DELETE' })
  },
}

// ==================== PAYMENTS API ====================
export const paymentsAPI = {
  list: async (params?: { flatId?: string; billingMonth?: string; status?: string; billId?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return fetchApi<any[]>(`/payments${qs}`, { method: 'GET' })
  },

  create: async (data: { billId: string; paidAmount: number; paymentMethod: string; transactionId?: string; remarks?: string }) => {
    return fetchApi<any>('/payments', { method: 'POST', body: JSON.stringify(data) })
  },

  getById: async (id: string) => {
    return fetchApi<any>(`/payments/${id}`, { method: 'GET' })
  },

  update: async (id: string, data: any) => {
    return fetchApi<any>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  getDefaulters: async () => {
    return fetchApi<any[]>('/payments/defaulters', { method: 'GET' })
  },

  getPendingVerifications: async () => {
    return fetchApi<any[]>('/payments/pending-verifications', { method: 'GET' })
  },

  verifyPayment: async (id: string, data: { action: 'approve' | 'reject'; rejectionReason?: string }) => {
    return fetchApi<any>(`/payments/${id}/verify`, { method: 'PUT', body: JSON.stringify(data) })
  },
}

// ==================== RESIDENT PORTAL API ====================
export const residentAPI = {
  getMyFlat: async () => {
    return fetchApi<any>('/resident/my-flat', { method: 'GET' })
  },

  getMyBills: async () => {
    return fetchApi<any>('/resident/my-bills', { method: 'GET' })
  },

  getMyPayments: async () => {
    return fetchApi<any>('/resident/my-payments', { method: 'GET' })
  },

  submitPayment: async (data: {
    billId?: string
    paidAmount: number
    paymentMethod: string
    transactionId?: string
    remarks?: string
    proofImage?: string
    receiptUrl?: string
    paymentDate?: string
    billingMonth?: string
  }) => {
    return fetchApi<any>('/resident/submit-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// ==================== COMPLAINTS API ====================
export const complaintsAPI = {
  list: async (params?: { status?: string; priority?: string; flatId?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return fetchApi<any[]>(`/complaints${qs}`, { method: 'GET' })
  },

  create: async (data: {
    flatNumber: string
    residentName: string
    category: string
    description: string
    priority?: string
    flatId?: string
  }) => {
    return fetchApi<any>('/complaints', { method: 'POST', body: JSON.stringify(data) })
  },

  getById: async (id: string) => {
    return fetchApi<any>(`/complaints/${id}`, { method: 'GET' })
  },

  update: async (id: string, data: {
    status?: string
    assignedTo?: string
    resolution?: string
    priority?: string
  }) => {
    return fetchApi<any>(`/complaints/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  delete: async (id: string) => {
    return fetchApi<any>(`/complaints/${id}`, { method: 'DELETE' })
  },

  addComment: async (id: string, message: string, author?: string) => {
    return fetchApi<any>(`/complaints/${id}/comments`, { method: 'POST', body: JSON.stringify({ message, author }) })
  },
}

// ==================== NOTIFICATIONS API ====================
export const notificationsAPI = {
  list: async () => {
    return fetchApi<any[]>('/notifications', { method: 'GET' })
  },

  markRead: async (id: string) => {
    return fetchApi<any>(`/notifications/${id}/read`, { method: 'PUT' })
  },

  markAllRead: async () => {
    return fetchApi<any>('/notifications/read-all', { method: 'PUT' })
  },
}

// ==================== REPORTS API ====================
export const reportsAPI = {
  financial: async (year?: number) => {
    const qs = year ? `?year=${year}` : ''
    return fetchApi<any>(`/reports/financial${qs}`, { method: 'GET' })
  },

  collections: async () => {
    return fetchApi<any>('/reports/collections', { method: 'GET' })
  },

  expenses: async (year?: number) => {
    const qs = year ? `?year=${year}` : ''
    return fetchApi<any>(`/reports/expenses${qs}`, { method: 'GET' })
  },

  complaints: async () => {
    return fetchApi<any>('/reports/complaints', { method: 'GET' })
  },

  occupancy: async () => {
    return fetchApi<any>('/reports/occupancy', { method: 'GET' })
  },
}

// ==================== HEALTH CHECK API ====================
export const healthAPI = {
  check: async () => {
    return fetchApi<any>('/health', {
      method: 'GET',
      requiresAuth: false,
    })
  },
}
