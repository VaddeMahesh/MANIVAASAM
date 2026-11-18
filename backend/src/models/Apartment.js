const mongoose = require('mongoose');

const apartmentSchema = new mongoose.Schema({
  apartmentName: {
    type: String,
    required: [true, 'Apartment name is required'],
    trim: true,
    minlength: [2, 'Apartment name must be at least 2 characters']
  },
  // Short public identifier residents use to find their society, e.g. "SRI4821".
  // Flat numbers repeat across societies; (societyCode + flatNumber) is globally unique.
  societyCode: {
    type: String,
    uppercase: true,
    trim: true
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
apartmentSchema.index(
  { societyCode: 1 },
  { unique: true, partialFilterExpression: { societyCode: { $type: 'string' } } }
);

/**
 * Build a unique code: first 3 letters of the name + 4 random digits, e.g. "TULASIVANAM" -> "TUL4821".
 * Retries on collision; falls back to a longer random suffix if a prefix gets crowded.
 */
apartmentSchema.statics.generateSocietyCode = async function (apartmentName) {
  const letters = String(apartmentName || '').toUpperCase().replace(/[^A-Z]/g, '');
  const prefix = (letters + 'SOC').slice(0, 3);
  for (let attempt = 0; attempt < 20; attempt++) {
    const digits = attempt < 15 ? 4 : 6;
    const min = 10 ** (digits - 1);
    const code = prefix + String(Math.floor(min + Math.random() * 9 * min));
    if (!(await this.exists({ societyCode: code }))) return code;
  }
  throw new Error('Could not generate a unique society code. Please try again.');
};

/**
 * Make sure an apartment has a society code, assigning one if it is missing (e.g. societies created
 * before codes existed). Uses an atomic conditional update so two concurrent requests can't assign
 * different codes. Returns the code. Accepts a document, a lean object, or an id.
 */
apartmentSchema.statics.ensureSocietyCode = async function (apartmentOrId) {
  if (!apartmentOrId) return undefined;
  const id = apartmentOrId._id || apartmentOrId;
  if (apartmentOrId.societyCode) return apartmentOrId.societyCode;

  const current = await this.findById(id).select('apartmentName societyCode').lean();
  if (!current) return undefined;
  if (current.societyCode) return current.societyCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await this.generateSocietyCode(current.apartmentName);
    try {
      const updated = await this.findOneAndUpdate(
        { _id: id, $or: [{ societyCode: { $exists: false } }, { societyCode: null }, { societyCode: '' }] },
        { $set: { societyCode: code } },
        { new: true, runValidators: false }
      ).select('societyCode').lean();
      if (updated) return updated.societyCode;
      // Someone else assigned it first: use theirs
      const again = await this.findById(id).select('societyCode').lean();
      return again?.societyCode;
    } catch (err) {
      if (err.code !== 11000) throw err; // code collided with another society: try a new one
    }
  }
  throw new Error('Could not assign a society code');
};

apartmentSchema.pre('validate', async function () {
  if (!this.societyCode) {
    this.societyCode = await this.constructor.generateSocietyCode(this.apartmentName);
  }
});

module.exports = mongoose.model('Apartment', apartmentSchema);
