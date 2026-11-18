const mongoose = require('mongoose');
const { normalizeFlatNumber, toFlatKey } = require('../utils/flatKey');

const flatSchema = new mongoose.Schema({
  flatNumber: {
    type: String,
    required: [true, 'Flat number is required'],
    trim: true
  },
  // Derived from flatNumber ("A-101" -> "A101"); unique per apartment so "A101" and "A-101"
  // cannot be saved as two different flats. Always set automatically, never by clients.
  flatKey: {
    type: String,
    index: false
  },
  apartmentId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Apartment',
  required: true,
  validate: {
    validator: async function(value) {
      if (!value) return false;
      const Apartment = mongoose.model('Apartment');
      const exists = await Apartment.exists({ _id: value });
      return !!exists;
    },
    message: 'Apartment not found'
  }
},
  floorNumber: {
    type: Number,
    required: [true, 'Floor number is required'],
    min: 1
  },
  area: {
    type: Number,
    default: null // in square feet
  },
  owner: {
    name: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Owner email is required'],
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phoneNumber: {
      type: String,
      required: [true, 'Owner phone number is required'],
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
    },
    panCard: String,
    aadharCard: String
  },
  occupationType: {
    type: String,
    enum: ['owner', 'rented'],
    required: [true, 'Occupation type is required'],
    default: 'owner'
  },
  renter: {
    name: String,
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phoneNumber: {
      type: String,
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
    },
    rentStartDate: Date,
    rentEndDate: Date,
    rentAmount: Number
  },
  status: {
    type: String,
    enum: ['occupied', 'vacant'],
    default: 'occupied'
  },
  isCommitteeMember: {
    type: Boolean,
    default: false
  },
  committeeRole: {
    type: String,
    enum: ['president', 'vice_president', 'secretary', 'treasurer', 'member']
  },
  membershipStartDate: {
    type: Date
  },
  membershipEndDate: {
    type: Date
  },
  dues: {
    maintenanceFeePerMonth: {
      type: Number,
      default: 0
    },
    totalDueAmount: {
      type: Number,
      default: 0
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    lastPaymentDate: Date,
    pendingDueAmount: {
      type: Number,
      default: 0
    }
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  documents: {
    ownershipProof: String,
    agreementCopy: String
  }
}, {
  timestamps: true
});

// Middleware to update pending due amount
flatSchema.pre('save', function(next) {
  if (this.dues) {
    this.dues.pendingDueAmount = this.dues.totalDueAmount - this.dues.paidAmount;
  }
  next();
});

// Validate renter data when occupationType is 'rented'
flatSchema.pre('save', async function(next) {
  if (this.occupationType === 'rented') {
    if (!this.renter?.name || !this.renter?.email || !this.renter?.phoneNumber) {
      throw new Error('Renter details are required when occupationType is rented');
    }
  }
  next();
});

// Keep flatNumber tidy and flatKey in sync on create/save
flatSchema.pre('validate', function () {
  if (this.flatNumber) {
    this.flatNumber = normalizeFlatNumber(this.flatNumber);
    this.flatKey = toFlatKey(this.flatNumber);
  }
});

// ...and on findByIdAndUpdate / findOneAndUpdate (used by the admin "edit flat" API)
flatSchema.pre(['findOneAndUpdate', 'updateOne'], function () {
  const update = this.getUpdate() || {};
  const target = update.$set || update;
  if (target.flatNumber) {
    target.flatNumber = normalizeFlatNumber(target.flatNumber);
    target.flatKey = toFlatKey(target.flatNumber);
  } else if ('flatKey' in target) {
    delete target.flatKey; // derived field, never client-controlled
  }
});

// Index for faster queries
flatSchema.index({ apartmentId: 1, flatNumber: 1 }, { unique: true });
flatSchema.index(
  { apartmentId: 1, flatKey: 1 },
  { unique: true, partialFilterExpression: { flatKey: { $type: 'string' } } }
);
flatSchema.index({ 'owner.email': 1 });
flatSchema.index({ isCommitteeMember: 1 });
flatSchema.index({ status: 1 });

module.exports = mongoose.model('Flat', flatSchema);
