const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a hostel name'],
    trim: true,
    maxlength: [100, 'Name can not be more than 100 characters']
  },
  address: {
    type: String,
    default: ''
  },
  contactNumber: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  description: {
    type: String,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  propertyType: {
    type: String,
    enum: ['hotel', 'resort', 'homestay', 'guesthouse', 'hostel', 'villa', 'other'],
    default: 'hotel'
  },
  logo: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    trim: true,
    default: ''
  },
  pincode: {
    type: String,
    trim: true,
    default: ''
  },
  checkInTime: {
    type: String,
    default: '12:00 PM'
  },
  checkOutTime: {
    type: String,
    default: '11:00 AM'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  aiOcrEnabled: {
    type: Boolean,
    default: false
  },
  digitalAadhaarEnabled: {
    type: Boolean,
    default: false
  },
  laundryEnabled: {
    type: Boolean,
    default: false
  },
  laundrySettings: {
    defaultVendorName: { type: String, default: '' },
    defaultVendorPhone: { type: String, default: '' },
    defaultRates: { type: Map, of: Number, default: {} },
    linenInventory: { type: Map, of: Number, default: {} },
    linenItems: [{
      itemName: { type: String },
      defaultRate: { type: Number, default: 0 }
    }]
  },
  whatsappSyncEnabled: {
    type: Boolean,
    default: false
  },
  whatsappStatus: {
    type: String,
    enum: ['disconnected', 'connecting', 'connected'],
    default: 'disconnected'
  },
  whatsappPhone: {
    type: String,
    default: ''
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  upiPayeeName: {
    type: String,
    trim: true,
    default: ''
  },
  // 🧾 GST & INVOICE SETTINGS
  gstEnabled: {
    type: Boolean,
    default: false
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  taxInclusive: {
    type: Boolean,
    default: true
  },
  gstRate: {
    type: Number,
    default: 12
  },
  hsnSacCode: {
    type: String,
    trim: true,
    default: '996311'
  },
  state: {
    type: String,
    trim: true,
    default: ''
  },
  stateCode: {
    type: String,
    trim: true,
    default: ''
  },
  invoicePrefix: {
    type: String,
    trim: true,
    default: 'INV'
  },
  autoApplyGstOnCheckin: {
    type: Boolean,
    default: true
  },
  billTerms: {
    type: String,
    default: '1. Check-out time is 11:00 AM.\n2. Valid Govt ID proof required at check-in.\n3. Goods & services once billed are non-refundable.\n4. Disputes subject to local jurisdiction only.'
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  onboardedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  assignedSalesAgent: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  // 🎟️ SUBSCRIPTION & BILLING PLAN DETAILS
  plan: {
    type: String,
    enum: ['demo', 'monthly', 'yearly', 'annual', 'starter', 'professional', 'enterprise', 'custom'],
    default: 'demo'
  },
  planStatus: {
    type: String,
    enum: ['trial', 'active', 'expired', 'cancelled'],
    default: 'trial'
  },
  planStartDate: {
    type: Date,
    default: Date.now
  },
  planEndDate: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7-day demo
  },
  planPrice: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  extraCharges: {
    type: Number,
    default: 0
  },
  billingCycle: {
    type: String,
    enum: ['trial', 'monthly', 'quarterly', 'yearly', 'lifetime', 'annual'],
    default: 'trial'
  },
  maxRooms: {
    type: Number,
    default: 20
  },
  planNotes: {
    type: String,
    default: ''
  },
  subscriptionHistory: [{
    plan: {
      type: String,
      default: 'monthly'
    },
    billingCycle: {
      type: String,
      default: 'monthly'
    },
    planPrice: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    extraCharges: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      default: 0
    },
    paymentMethod: {
      type: String,
      default: 'UPI'
    },
    paymentReference: {
      type: String,
      default: ''
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    durationDays: {
      type: Number,
      default: 30
    },
    actionType: {
      type: String,
      enum: ['initial', 'renewal', 'upgrade', 'extension', 'adjustment'],
      default: 'renewal'
    },
    notes: {
      type: String,
      default: ''
    },
    recordedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    recordedByName: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Hostel', hostelSchema);
