const mongoose = require('mongoose');

const committeeMemberSchema = new mongoose.Schema({
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
  memberName: {
    type: String,
    required: [true, 'Committee member name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
  },
  role: {
    type: String,
    enum: ['president', 'vice_president', 'secretary', 'treasurer', 'member'],
    required: [true, 'Role is required'],
    default: 'member'
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  resignationDate: {
    type: Date,
    sparse: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'resigned'],
    default: 'active'
  },
  permissions: {
    canApproveExpenses: {
      type: Boolean,
      default: false
    },
    canManageFlats: {
      type: Boolean,
      default: false
    },
    canManageExpenses: {
      type: Boolean,
      default: false
    },
    canManageMembers: {
      type: Boolean,
      default: false
    },
    canAccessReports: {
      type: Boolean,
      default: false
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    pinCode: String
  },
  panCard: String,
  bankAccount: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String
  }
}, {
  timestamps: true
});

// Index for faster queries
committeeMemberSchema.index({ apartmentId: 1, status: 1 });
committeeMemberSchema.index({ flatId: 1 });
committeeMemberSchema.index({ email: 1 });

module.exports = mongoose.model('CommitteeMember', committeeMemberSchema);
