const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema({
  apartmentName: {
    type: String,
    required: [true, 'Apartment name is required'],
    trim: true,
    minlength: [2, 'Apartment name must be at least 2 characters']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pinCode: {
      type: String,
      required: [true, 'PIN code is required'],
      match: [/^[0-9]{6}$/, 'PIN code must be 6 digits']
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    }
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  numberOfFlats: {
    type: Number,
    required: [true, 'Number of flats is required'],
    min: [1, 'Must have at least 1 flat'],
    max: [1000, 'Cannot have more than 1000 flats']
  },
  numberOfFloors: {
    type: Number,
    required: [true, 'Number of floors is required'],
    min: [1, 'Must have at least 1 floor'],
    max: [100, 'Cannot have more than 100 floors']
  },
  totalArea: {
    type: Number,
    default: null // in square feet
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  metadata: {
    emergencyContactName: String,
    emergencyContactPhone: String,
    maintenanceGuidelines: String,
    surplusFunds: [
      {
        amount: { type: Number, default: 0 },
        memo: String,
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', sparse: true }
      }
    ]
  }
}, {
  timestamps: true
});

// Index for faster queries
apartmentSchema.index({ adminId: 1 });
apartmentSchema.index({ 'address.pinCode': 1 });

module.exports = mongoose.model('Apartment', apartmentSchema);
