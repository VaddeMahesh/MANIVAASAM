const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: true
  },
  flatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flat',
    required: true
  },
  flatNumber: {
    type: String,
    required: true
  },
  ownerName: {
    type: String,
    required: true
  },
  billingMonth: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}$/, 'Billing month must be in YYYY-MM format']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  penalty: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'partial', 'overdue'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'online'],
    sparse: true
  },
  paidDate: Date,
  transactionId: String,
  remarks: String,
  waterUsed: Number,
  meterStart: Number,
  meterEnd: Number,
  breakdown: {
    manjeeraWaterAmt: Number,
    pvtTankerAmt: Number,
    hmwssbBill: Number,
    commonMaintAmt: Number,
    waterUsedLiters: Number,
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

billSchema.index({ apartmentId: 1, billingMonth: 1 });
billSchema.index({ flatId: 1, billingMonth: 1 }, { unique: true });
billSchema.index({ status: 1 });
billSchema.index({ apartmentId: 1, status: 1 });

billSchema.virtual('balanceAmount').get(function () {
  return Math.max(0, this.amount + this.penalty - this.paidAmount);
});

billSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Bill', billSchema);
