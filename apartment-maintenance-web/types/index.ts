// Flat / Unit types
export type OccupancyStatus = 'occupied' | 'vacant'
export type OccupancyType = 'owner' | 'tenant'
export type CommitteeRole = 'president' | 'vice_president' | 'secretary' | 'treasurer' | 'member' | null

export interface Flat {
  id: string
  flatNumber: string
  floor: number
  ownerName: string
  ownerMobile: string
  ownerEmail: string
  occupancyStatus: OccupancyStatus
  occupancyType: OccupancyType
  tenantName?: string
  tenantMobile?: string
  tenantEmail?: string
  createdAt: string
}

// Committee
export interface CommitteeMember {
  id: string
  flatId: string
  flatNumber: string
  memberName: string
  mobile: string
  email: string
  role: Exclude<CommitteeRole, null>
  since: string
  avatar?: string
}

// Billing
export type BillingStatus = 'paid' | 'pending' | 'partial' | 'overdue' | 'pending_verification' | 'rejected'

export interface Bill {
  id: string
  flatId: string
  flatNumber: string
  ownerName: string
  billingMonth: string
  amount: number
  dueDate: string
  paidAmount: number
  penalty: number
  status: BillingStatus
  createdAt: string
}

// Collections / Payments
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'online'

export interface Payment {
  id: string
  billId: string
  flatId: string
  flatNumber: string
  ownerName: string
  billingMonth: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  transactionId?: string
  remarks?: string
  receiptUrl?: string
  status: BillingStatus
}

// Expenses
export type ExpenseCategory = 'electricity' | 'water' | 'repairs' | 'maintenance' | 'security' | 'cleaning' | 'other'
export type ExpenseStatus = 'paid' | 'unpaid'

export type ExpensePaidBy = 'apartment' | 'flat_owner' | 'other'

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  status: ExpenseStatus
  paidBy?: ExpensePaidBy
  remarks?: string
  receipt?: string
}

// Complaints
export type ComplaintCategory = 'water' | 'electricity' | 'lift' | 'parking' | 'security' | 'cleaning' | 'noise' | 'other'
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'emergency'
export type ComplaintStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'

export interface ComplaintComment {
  id: string
  author: string
  message: string
  timestamp: string
}

export interface Complaint {
  id: string
  flatId: string
  flatNumber: string
  residentName: string
  category: ComplaintCategory
  priority: ComplaintPriority
  status: ComplaintStatus
  description: string
  assignedTo?: string
  date: string
  resolvedAt?: string
  resolution?: string
  comments: ComplaintComment[]
  images?: string[]
}

// Notifications
export type NotificationType = 'payment' | 'complaint' | 'announcement' | 'reminder' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
}

// Bank Details
export interface BankDetails {
  bankName: string
  accountNumber: string
  ifscCode: string
  accountHolderName: string
  upiId: string
  qrCodeUrl?: string
}

// Apartment
export interface Apartment {
  name: string
  address: string
  pincode: string
  floors: number
  totalFlats: number
  email: string
  phone?: string
  logo?: string
}

// Analytics / Dashboard
export interface MonthlyData {
  month: string
  collections: number
  expenses: number
}

export interface DashboardStats {
  totalFlats: number
  occupiedFlats: number
  vacantFlats: number
  totalCollections: number
  pendingDues: number
  totalExpenses: number
  remainingBalance: number
  openComplaints: number
}

// User / Auth
export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  avatar?: string
}
