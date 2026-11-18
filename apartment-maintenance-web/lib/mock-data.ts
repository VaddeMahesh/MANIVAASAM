import type {
  Flat, CommitteeMember, Bill, Payment, Expense, Complaint,
  Notification, BankDetails, Apartment, MonthlyData, DashboardStats
} from '@/types'

export const apartment: Apartment = {
  name: 'Greenview Residency',
  address: '42, Palm Street, Koramangala',
  pincode: '560034',
  floors: 6,
  totalFlats: 36,
  email: 'admin@greenviewresidency.com',
  phone: '+91 80 4567 8901',
}

export const flats: Flat[] = [
  { id: 'f1', flatNumber: 'A-101', floor: 1, ownerName: 'Rajesh Kumar', ownerMobile: '9876543210', ownerEmail: 'rajesh@email.com', occupancyStatus: 'occupied', occupancyType: 'owner', isCommitteeMember: true, committeeRole: 'President', createdAt: '2023-01-15' },
  { id: 'f2', flatNumber: 'A-102', floor: 1, ownerName: 'Priya Sharma', ownerMobile: '9876543211', ownerEmail: 'priya@email.com', occupancyStatus: 'occupied', occupancyType: 'tenant', tenantName: 'Vikram Singh', tenantMobile: '9876543220', tenantEmail: 'vikram@email.com', isCommitteeMember: false, committeeRole: null, createdAt: '2023-02-01' },
  { id: 'f3', flatNumber: 'A-103', floor: 1, ownerName: 'Anita Desai', ownerMobile: '9876543212', ownerEmail: 'anita@email.com', occupancyStatus: 'vacant', occupancyType: 'owner', isCommitteeMember: false, committeeRole: null, createdAt: '2023-01-20' },
  { id: 'f4', flatNumber: 'B-201', floor: 2, ownerName: 'Suresh Patel', ownerMobile: '9876543213', ownerEmail: 'suresh@email.com', occupancyStatus: 'occupied', occupancyType: 'owner', isCommitteeMember: true, committeeRole: 'Secretary', createdAt: '2023-01-10' },
  { id: 'f5', flatNumber: 'B-202', floor: 2, ownerName: 'Meera Nair', ownerMobile: '9876543214', ownerEmail: 'meera@email.com', occupancyStatus: 'occupied', occupancyType: 'tenant', tenantName: 'Rohit Das', tenantMobile: '9876543221', tenantEmail: 'rohit@email.com', isCommitteeMember: false, committeeRole: null, createdAt: '2023-03-05' },
  { id: 'f6', flatNumber: 'B-203', floor: 2, ownerName: 'Amit Verma', ownerMobile: '9876543215', ownerEmail: 'amit@email.com', occupancyStatus: 'occupied', occupancyType: 'owner', isCommitteeMember: true, committeeRole: 'Treasurer', createdAt: '2023-01-12' },
  { id: 'f7', flatNumber: 'C-301', floor: 3, ownerName: 'Sunita Rao', ownerMobile: '9876543216', ownerEmail: 'sunita@email.com', occupancyStatus: 'occupied', occupancyType: 'owner', isCommitteeMember: true, committeeRole: 'Member', createdAt: '2023-02-20' },
  { id: 'f8', flatNumber: 'C-302', floor: 3, ownerName: 'Kiran Joshi', ownerMobile: '9876543217', ownerEmail: 'kiran@email.com', occupancyStatus: 'vacant', occupancyType: 'owner', isCommitteeMember: false, committeeRole: null, createdAt: '2023-04-01' },
  { id: 'f9', flatNumber: 'C-303', floor: 3, ownerName: 'Deepak Malhotra', ownerMobile: '9876543218', ownerEmail: 'deepak@email.com', occupancyStatus: 'occupied', occupancyType: 'tenant', tenantName: 'Pooja Iyer', tenantMobile: '9876543222', tenantEmail: 'pooja@email.com', isCommitteeMember: false, committeeRole: null, createdAt: '2023-03-15' },
  { id: 'f10', flatNumber: 'D-401', floor: 4, ownerName: 'Geeta Sinha', ownerMobile: '9876543219', ownerEmail: 'geeta@email.com', occupancyStatus: 'occupied', occupancyType: 'owner', isCommitteeMember: false, committeeRole: null, createdAt: '2023-05-01' },
  { id: 'f11', flatNumber: 'D-402', floor: 4, ownerName: 'Ramesh Gupta', ownerMobile: '9876543223', ownerEmail: 'ramesh@email.com', occupancyStatus: 'occupied', occupancyType: 'owner', isCommitteeMember: false, committeeRole: null, createdAt: '2023-01-25' },
  { id: 'f12', flatNumber: 'E-501', floor: 5, ownerName: 'Lalitha Menon', ownerMobile: '9876543224', ownerEmail: 'lalitha@email.com', occupancyStatus: 'vacant', occupancyType: 'owner', isCommitteeMember: false, committeeRole: null, createdAt: '2023-06-10' },
]

export const committeeMembers: CommitteeMember[] = [
  { id: 'c1', flatId: 'f1', flatNumber: 'A-101', memberName: 'Rajesh Kumar', mobile: '9876543210', email: 'rajesh@email.com', role: 'President', since: '2023-01-01' },
  { id: 'c2', flatId: 'f4', flatNumber: 'B-201', memberName: 'Suresh Patel', mobile: '9876543213', email: 'suresh@email.com', role: 'Secretary', since: '2023-01-01' },
  { id: 'c3', flatId: 'f6', flatNumber: 'B-203', memberName: 'Amit Verma', mobile: '9876543215', email: 'amit@email.com', role: 'Treasurer', since: '2023-01-01' },
  { id: 'c4', flatId: 'f7', flatNumber: 'C-301', memberName: 'Sunita Rao', mobile: '9876543216', email: 'sunita@email.com', role: 'Member', since: '2023-06-01' },
]

export const bills: Bill[] = [
  { id: 'b1', flatId: 'f1', flatNumber: 'A-101', ownerName: 'Rajesh Kumar', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 3000, penalty: 0, status: 'paid', createdAt: '2026-04-01' },
  { id: 'b2', flatId: 'f2', flatNumber: 'A-102', ownerName: 'Priya Sharma', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 0, penalty: 0, status: 'pending', createdAt: '2026-04-01' },
  { id: 'b3', flatId: 'f4', flatNumber: 'B-201', ownerName: 'Suresh Patel', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 3000, penalty: 0, status: 'paid', createdAt: '2026-04-01' },
  { id: 'b4', flatId: 'f5', flatNumber: 'B-202', ownerName: 'Meera Nair', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 1500, penalty: 0, status: 'partial', createdAt: '2026-04-01' },
  { id: 'b5', flatId: 'f6', flatNumber: 'B-203', ownerName: 'Amit Verma', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 3000, penalty: 0, status: 'paid', createdAt: '2026-04-01' },
  { id: 'b6', flatId: 'f7', flatNumber: 'C-301', ownerName: 'Sunita Rao', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 0, penalty: 150, status: 'overdue', createdAt: '2026-04-01' },
  { id: 'b7', flatId: 'f9', flatNumber: 'C-303', ownerName: 'Deepak Malhotra', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 0, penalty: 150, status: 'overdue', createdAt: '2026-04-01' },
  { id: 'b8', flatId: 'f10', flatNumber: 'D-401', ownerName: 'Geeta Sinha', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 3000, penalty: 0, status: 'paid', createdAt: '2026-04-01' },
  { id: 'b9', flatId: 'f1', flatNumber: 'A-101', ownerName: 'Rajesh Kumar', billingMonth: '2026-05', amount: 3000, dueDate: '2026-05-10', paidAmount: 0, penalty: 0, status: 'pending', createdAt: '2026-05-01' },
  { id: 'b10', flatId: 'f11', flatNumber: 'D-402', ownerName: 'Ramesh Gupta', billingMonth: '2026-04', amount: 3000, dueDate: '2026-04-10', paidAmount: 3000, penalty: 0, status: 'paid', createdAt: '2026-04-01' },
]

export const payments: Payment[] = [
  { id: 'p1', billId: 'b1', flatId: 'f1', flatNumber: 'A-101', ownerName: 'Rajesh Kumar', billingMonth: '2026-04', totalAmount: 3000, paidAmount: 3000, balanceAmount: 0, paymentDate: '2026-04-05', paymentMethod: 'upi', transactionId: 'TXN001234', status: 'paid' },
  { id: 'p2', billId: 'b3', flatId: 'f4', flatNumber: 'B-201', ownerName: 'Suresh Patel', billingMonth: '2026-04', totalAmount: 3000, paidAmount: 3000, balanceAmount: 0, paymentDate: '2026-04-07', paymentMethod: 'bank_transfer', transactionId: 'TXN001235', status: 'paid' },
  { id: 'p3', billId: 'b4', flatId: 'f5', flatNumber: 'B-202', ownerName: 'Meera Nair', billingMonth: '2026-04', totalAmount: 3000, paidAmount: 1500, balanceAmount: 1500, paymentDate: '2026-04-08', paymentMethod: 'cash', status: 'partial' },
  { id: 'p4', billId: 'b5', flatId: 'f6', flatNumber: 'B-203', ownerName: 'Amit Verma', billingMonth: '2026-04', totalAmount: 3000, paidAmount: 3000, balanceAmount: 0, paymentDate: '2026-04-03', paymentMethod: 'upi', transactionId: 'TXN001236', status: 'paid' },
  { id: 'p5', billId: 'b8', flatId: 'f10', flatNumber: 'D-401', ownerName: 'Geeta Sinha', billingMonth: '2026-04', totalAmount: 3000, paidAmount: 3000, balanceAmount: 0, paymentDate: '2026-04-09', paymentMethod: 'online', transactionId: 'TXN001237', status: 'paid' },
  { id: 'p6', billId: 'b10', flatId: 'f11', flatNumber: 'D-402', ownerName: 'Ramesh Gupta', billingMonth: '2026-04', totalAmount: 3000, paidAmount: 3000, balanceAmount: 0, paymentDate: '2026-04-02', paymentMethod: 'cheque', transactionId: 'CHQ001238', status: 'paid' },
]

export const expenses: Expense[] = [
  { id: 'e1', category: 'electricity', description: 'Common area electricity bill - April', amount: 8500, date: '2026-04-15', status: 'paid', remarks: 'BESCOM bill paid' },
  { id: 'e2', category: 'water', description: 'Water tanker charges - April', amount: 3200, date: '2026-04-10', status: 'paid' },
  { id: 'e3', category: 'security', description: 'Security guard salary - April', amount: 12000, date: '2026-04-30', status: 'paid' },
  { id: 'e4', category: 'cleaning', description: 'Housekeeping staff salary - April', amount: 8000, date: '2026-04-30', status: 'paid' },
  { id: 'e5', category: 'repairs', description: 'Lift maintenance contract', amount: 5000, date: '2026-05-01', status: 'unpaid', remarks: 'Due on 5th May' },
  { id: 'e6', category: 'maintenance', description: 'Garden maintenance - April', amount: 2500, date: '2026-04-20', status: 'paid' },
  { id: 'e7', category: 'repairs', description: 'Water pump repair', amount: 3800, date: '2026-04-25', status: 'paid' },
  { id: 'e8', category: 'other', description: 'Stationery and admin expenses', amount: 750, date: '2026-04-05', status: 'paid' },
  { id: 'e9', category: 'electricity', description: 'Common area electricity - May', amount: 8200, date: '2026-05-15', status: 'unpaid' },
  { id: 'e10', category: 'security', description: 'Security guard salary - May', amount: 12000, date: '2026-05-31', status: 'unpaid' },
]

export const complaints: Complaint[] = [
  { id: 'CP001', flatId: 'f2', flatNumber: 'A-102', residentName: 'Vikram Singh', category: 'water', priority: 'high', status: 'in_progress', description: 'Water leakage from overhead tank affecting my apartment ceiling.', assignedTo: 'Suresh Patel', date: '2026-05-08', comments: [{ id: 'cm1', author: 'Suresh Patel', message: 'Plumber has been assigned and will visit tomorrow.', timestamp: '2026-05-09T10:00:00' }] },
  { id: 'CP002', flatId: 'f5', flatNumber: 'B-202', residentName: 'Rohit Das', category: 'electricity', priority: 'medium', status: 'open', description: 'Street lights near parking area not working for past 3 days.', date: '2026-05-10', comments: [] },
  { id: 'CP003', flatId: 'f9', flatNumber: 'C-303', residentName: 'Pooja Iyer', category: 'lift', priority: 'high', status: 'assigned', description: 'Lift making unusual noise and stopping between floors.', assignedTo: 'Amit Verma', date: '2026-05-11', comments: [{ id: 'cm2', author: 'Amit Verma', message: 'Contacted lift maintenance company. They will visit on 13th May.', timestamp: '2026-05-11T15:30:00' }] },
  { id: 'CP004', flatId: 'f10', flatNumber: 'D-401', residentName: 'Geeta Sinha', category: 'noise', priority: 'low', status: 'resolved', description: 'Late night noise from floor above during weekends.', date: '2026-04-20', resolvedAt: '2026-04-22', resolution: 'Issue discussed with concerned flat residents. Resolved amicably.', comments: [] },
  { id: 'CP005', flatId: 'f1', flatNumber: 'A-101', residentName: 'Rajesh Kumar', category: 'security', priority: 'emergency', status: 'open', description: 'Main gate lock broken, security risk for all residents.', date: '2026-05-12', comments: [] },
  { id: 'CP006', flatId: 'f7', flatNumber: 'C-301', residentName: 'Sunita Rao', category: 'cleaning', priority: 'medium', status: 'closed', description: 'Common corridor not being cleaned regularly.', date: '2026-04-15', resolvedAt: '2026-04-17', resolution: 'Housekeeping schedule updated. Extra cleaning on weekends added.', comments: [] },
]

export const notifications: Notification[] = [
  { id: 'n1', type: 'payment', title: 'Payment Received', message: 'Rajesh Kumar (A-101) paid ₹3,000 for April 2026.', timestamp: '2026-05-05T10:30:00', read: false },
  { id: 'n2', type: 'complaint', title: 'New Complaint Filed', message: 'Emergency complaint filed by A-101 regarding broken main gate.', timestamp: '2026-05-12T09:15:00', read: false },
  { id: 'n3', type: 'reminder', title: 'Payment Due Reminder', message: '3 flats have overdue maintenance dues. Send reminders.', timestamp: '2026-05-10T08:00:00', read: false },
  { id: 'n4', type: 'announcement', title: 'General Body Meeting', message: 'Annual General Body Meeting scheduled for May 20, 2026 at 6 PM in Community Hall.', timestamp: '2026-05-08T12:00:00', read: true },
  { id: 'n5', type: 'system', title: 'Expense Recorded', message: 'Lift maintenance expense of ₹5,000 added for May 2026.', timestamp: '2026-05-01T11:00:00', read: true },
  { id: 'n6', type: 'complaint', title: 'Complaint Resolved', message: 'Complaint CP004 (Noise - D-401) has been resolved.', timestamp: '2026-04-22T16:00:00', read: true },
]

export const bankDetails: BankDetails = {
  bankName: 'State Bank of India',
  accountNumber: '38291047563829',
  ifscCode: 'SBIN0012345',
  accountHolderName: 'Greenview Residency Welfare Association',
  upiId: 'greenview.welfare@sbi',
}

export const monthlyData: MonthlyData[] = [
  { month: 'Nov', collections: 28000, expenses: 31500 },
  { month: 'Dec', collections: 33000, expenses: 29800 },
  { month: 'Jan', collections: 30000, expenses: 33200 },
  { month: 'Feb', collections: 27000, expenses: 28500 },
  { month: 'Mar', collections: 35000, expenses: 31000 },
  { month: 'Apr', collections: 31500, expenses: 43750 },
  { month: 'May', collections: 18000, expenses: 20200 },
]

export const dashboardStats: DashboardStats = {
  totalFlats: 12,
  occupiedFlats: 9,
  vacantFlats: 3,
  totalCollections: 181500,
  pendingDues: 13650,
  totalExpenses: 217950,
  remainingBalance: 124380,
  openComplaints: 3,
}
