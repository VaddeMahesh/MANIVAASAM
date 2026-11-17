const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
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
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'online'],
    required: true
  },
  transactionId: String,
  remarks: String,
  receiptUrl: String,
  proofUrl: String,
  submittedBy: {
    type: String,
    enum: ['admin', 'resident'],
    default: 'admin'
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident'
  },
  status: {
    type: String,
    enum: ['paid', 'partial', 'pending_verification', 'rejected'],
    default: 'paid'
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

paymentSchema.index({ apartmentId: 1, paymentDate: -1 });
paymentSchema.index({ flatId: 1 });
paymentSchema.index({ billId: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
