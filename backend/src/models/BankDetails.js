const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: true,
    unique: true
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true
  },
  accountHolderName: {
    type: String,
    required: [true, 'Account holder name is required'],
    trim: true
  },
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    trim: true,
    unique: true
  },
  accountType: {
    type: String,
    enum: ['savings', 'current', 'investment'],
    required: [true, 'Account type is required']
  },
  ifscCode: {
    type: String,
    required: [true, 'IFSC code is required'],
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'],
    trim: true
  },
  swiftCode: String,
  branchName: String,
  branchAddress: String,
  contactPersonName: String,
  contactPersonPhone: String,
  upiId: {
    type: String,
    lowercase: true,
    match: [/^[\w\.\-]+@[\w\-]+$/, 'Invalid UPI ID format'],
    sparse: true
  },
  qrCodeUrl: String,
  qrCodeData: String, // Base64 encoded QR code
  isPrimary: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'closed'],
    default: 'active'
  },
  documents: {
    chequeImage: String,
    proofOfAddress: String,
    incorporationCertificate: String
  },
  monthlyStatements: [
    {
      month: Number,
      year: Number,
      openingBalance: Number,
      closingBalance: Number,
      totalDeposits: Number,
      totalWithdrawals: Number,
      statementUrl: String,
      uploadedAt: Date
    }
  ],
  bankVerificationDate: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    sparse: true
  },
  notes: String
}, {
  timestamps: true
});

// Index for faster queries
bankDetailsSchema.index({ apartmentId: 1 });
bankDetailsSchema.index({ accountNumber: 1 });

module.exports = mongoose.model('BankDetails', bankDetailsSchema);
