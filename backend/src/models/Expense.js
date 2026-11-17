const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: true
  },
  month: {
    type: Number,
    required: [true, 'Month is required'],
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: 2000
  },
  category: {
    type: String,
    enum: ['income_maintenance', 'expenditure', 'electricity', 'water', 'repairs', 'maintenance', 'security', 'cleaning', 'other'],
    required: [true, 'Category is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be a positive number']
  },
  paidBy: {
    type: String,
    enum: ['apartment', 'flat_owner', 'other'],
    required: [true, 'Paid by is required'],
    default: 'apartment'
  },
  flatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flat',
    sparse: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial'],
    default: 'pending'
  },
  dueDate: Date,
  paidDate: Date,
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'online'],
    sparse: true
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [1000, 'Remarks cannot exceed 1000 characters']
  },
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    sparse: true
  },
  approvedAt: Date,
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    sparse: true
  },
  recurringEndDate: {
    type: Date,
    sparse: true
  }
}, {
  timestamps: true
});

// Index for faster queries
expenseSchema.index({ apartmentId: 1, year: 1, month: 1 });
expenseSchema.index({ apartmentId: 1, paymentStatus: 1 });
expenseSchema.index({ flatId: 1 });
expenseSchema.index({ createdAt: -1 });

// Calculate pending amount
expenseSchema.virtual('pendingAmount').get(function() {
  return this.amount - this.paidAmount;
});

// Convert virtuals to JSON
expenseSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Expense', expenseSchema);
