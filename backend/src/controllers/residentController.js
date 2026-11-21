const Flat = require('../models/Flat');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const AppError = require('../utils/AppError');
const { toFlatKey } = require('../utils/flatKey');

const COMPLAINT_CATEGORIES = ['water', 'electricity', 'lift', 'parking', 'security', 'cleaning', 'noise', 'other'];
const COMPLAINT_PRIORITIES = ['low', 'medium', 'high', 'emergency'];

// Case-insensitive exact match for flat numbers like "A-104" vs "a-104"
const flatNumberMatch = (flatNumber) => {
  const escaped = String(flatNumber).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
};

// Get resident's flat profile & overview
exports.getMyFlat = async (req, res, next) => {
  try {
    const resident = req.resident;
    if (!resident) return next(new AppError('Resident authentication required', 401));

    const flat = await Flat.findById(resident.flatId || resident.flatId?._id).populate('apartmentId');
    if (!flat) return next(new AppError('Flat record not found', 404));

    const aptId = flat.apartmentId?._id || flat.apartmentId;
    const flatNum = flat.flatNumber;

    // Get latest bill matching flatId or flatNumber variants
    const billQuery = {
      $or: [
        { flatId: flat._id },
        { flatNumber: flatNum },
        { flatNumber: flatNumberMatch(flatNum) },
        { flatNumber: toFlatKey(flatNum) }
      ]
    };
    if (aptId) billQuery.apartmentId = aptId;

    const latestBill = await Bill.findOne(billQuery).sort({ billingMonth: -1 });
    const allBills = await Bill.find(billQuery).sort({ billingMonth: -1 });

    let pendingTotal = 0;
    if (allBills.length > 0) {
      pendingTotal = allBills.reduce((sum, b) => {
        if (b.status === 'paid') return sum;
        const due = (b.amount || 0) + (b.penalty || 0) - (b.paidAmount || 0);
        return sum + Math.max(0, due);
      }, 0);
    } else {
      // If no bills generated yet, use flat dues configured by admin
      pendingTotal = Number(flat.dues?.pendingDueAmount ?? flat.dues?.totalDueAmount ?? 0);
    }

    // Sync flat dues object so both admin and resident see identical numbers
    const dues = {
      ...(flat.dues ? (flat.dues.toObject ? flat.dues.toObject() : flat.dues) : {}),
      pendingDueAmount: pendingTotal,
      totalDueAmount: pendingTotal,
    };

    res.json({
      success: true,
      data: {
        resident: {
          id: resident._id,
          name: resident.name,
          email: resident.email,
          phoneNumber: resident.phoneNumber,
          flatNumber: resident.flatNumber,
          role: resident.role
        },
        flat: {
          id: flat._id,
          flatNumber: flat.flatNumber,
          floorNumber: flat.floorNumber,
          area: flat.area,
          status: flat.status,
          occupationType: flat.occupationType,
          dues,
          apartmentName: flat.apartmentId?.apartmentName || 'Apartment Society',
          societyCode: flat.apartmentId?.societyCode
        },
        latestBill,
        pendingTotal
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all bills for this resident's flat
exports.getMyBills = async (req, res, next) => {
  try {
    const resident = req.resident;
    if (!resident) return next(new AppError('Resident authentication required', 401));

    const flat = await Flat.findById(resident.flatId || resident.flatId?._id);
    const flatNum = flat?.flatNumber || resident.flatNumber;
    const aptId = flat?.apartmentId || resident.apartmentId;

    const query = {
      $or: [
        { flatId: resident.flatId },
        { flatNumber: flatNum },
        { flatNumber: flatNumberMatch(flatNum) },
        { flatNumber: toFlatKey(flatNum) }
      ]
    };
    if (aptId) query.apartmentId = aptId;

    const bills = await Bill.find(query).sort({ billingMonth: -1 });

    res.json({
      success: true,
      data: bills
    });
  } catch (error) {
    next(error);
  }
};

// Get all payments (history + verification status) for this resident's flat
exports.getMyPayments = async (req, res, next) => {
  try {
    const resident = req.resident;
    if (!resident) return next(new AppError('Resident authentication required', 401));

    const flat = await Flat.findById(resident.flatId || resident.flatId?._id);
    const flatNum = flat?.flatNumber || resident.flatNumber;
    const aptId = flat?.apartmentId || resident.apartmentId;

    const query = {
      $or: [
        { flatId: resident.flatId },
        { flatNumber: flatNum },
        { flatNumber: flatNumberMatch(flatNum) },
        { flatNumber: toFlatKey(flatNum) },
        { residentId: resident._id }
      ]
    };
    if (aptId) query.apartmentId = aptId;

    const payments = await Payment.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// Submit payment with screenshot for admin verification
exports.submitPayment = async (req, res, next) => {
  try {
    const resident = req.resident;
    if (!resident) return next(new AppError('Resident authentication required', 401));

    const {
      billId,
      paidAmount,
      paymentMethod = 'upi',
      transactionId = '',
      remarks = '',
      proofImage = '',
      receiptUrl = '',
      paymentDate = new Date()
    } = req.body;

    if (!paidAmount || Number(paidAmount) <= 0) {
      return next(new AppError('Please provide a valid payment amount', 400));
    }

    // Find the bill
    let bill = null;
    if (billId) {
      bill = await Bill.findById(billId);
    }
    if (!bill) {
      // Find latest pending or partial bill for this flat
      bill = await Bill.findOne({
        $or: [{ flatId: resident.flatId }, { flatNumber: resident.flatNumber }],
        status: { $in: ['pending', 'partial', 'overdue'] }
      }).sort({ billingMonth: -1 });

      if (!bill) {
        bill = await Bill.findOne({
          $or: [{ flatId: resident.flatId }, { flatNumber: resident.flatNumber }]
        }).sort({ billingMonth: -1 });
      }
    }

    if (!bill) {
      return next(new AppError('No bills found for this flat. All dues are clear.', 400));
    }

    const remainingDue = Math.max(0, (bill.amount || 0) + (bill.penalty || 0) - (bill.paidAmount || 0));

    // STRICT CHECK: If admin already marked bill as paid or due is 0, do not allow payment!
    if (bill.status === 'paid' || remainingDue === 0) {
      return next(new AppError('This bill is already marked as Paid by the admin. No additional payment is required for this month.', 400));
    }

    // Check if resident already submitted a proof awaiting verification
    const existingPending = await Payment.findOne({
      billId: bill._id,
      status: 'pending_verification'
    });
    if (existingPending) {
      return next(new AppError('A payment submission for this month is already awaiting admin verification. Please wait for admin approval.', 400));
    }

    // Do not allow paying more than remaining due
    const finalPaidAmount = Math.min(Number(paidAmount), remainingDue);
    const proof = proofImage || receiptUrl || '';
    const total = bill.amount + (bill.penalty || 0);
    const balance = Math.max(0, remainingDue - finalPaidAmount);

    const payment = await Payment.create({
      apartmentId: resident.apartmentId,
      flatId: resident.flatId,
      billId: bill._id,
      flatNumber: resident.flatNumber,
      ownerName: resident.name,
      billingMonth: bill.billingMonth,
      totalAmount: total,
      paidAmount: finalPaidAmount,
      balanceAmount: balance,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod,
      transactionId,
      remarks,
      receiptUrl: proof,
      proofUrl: proof,
      status: 'pending_verification',
      submittedBy: 'resident',
      residentId: resident._id
    });

    res.status(201).json({
      success: true,
      message: 'Payment proof submitted successfully! Admin will verify and approve.',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Get complaints for this resident's flat:
//  - raised: complaints filed by / for this flat (with status & resolution)
//  - against: complaints other flats or the admin filed against this flat
exports.getMyComplaints = async (req, res, next) => {
  try {
    const resident = req.resident;
    if (!resident) return next(new AppError('Resident authentication required', 401));

    const myFlat = flatNumberMatch(resident.flatNumber);

    const [raised, against] = await Promise.all([
      Complaint.find({
        apartmentId: resident.apartmentId,
        $or: [{ residentId: resident._id }, { flatNumber: myFlat }]
      }).sort({ createdAt: -1 }),
      Complaint.find({
        apartmentId: resident.apartmentId,
        againstFlatNumber: myFlat
      }).sort({ createdAt: -1 })
    ]);

    // Hide who filed complaints against this flat to avoid disputes between neighbours
    const againstSanitized = against.map((c) => {
      const obj = c.toJSON();
      delete obj.residentName;
      delete obj.flatNumber;
      delete obj.flatId;
      delete obj.residentId;
      delete obj.createdBy;
      delete obj.comments;
      return obj;
    });

    res.json({
      success: true,
      data: { raised, against: againstSanitized }
    });
  } catch (error) {
    next(error);
  }
};

// Resident files a new complaint for their own flat (optionally against another flat)
exports.submitComplaint = async (req, res, next) => {
  try {
    const resident = req.resident;
    if (!resident) return next(new AppError('Resident authentication required', 401));

    const { category, description, priority = 'medium', againstFlatNumber } = req.body;

    if (!category || !COMPLAINT_CATEGORIES.includes(category)) {
      return next(new AppError('Please select a valid complaint category', 400));
    }
    if (!description || !String(description).trim()) {
      return next(new AppError('Please describe the issue', 400));
    }
    if (!COMPLAINT_PRIORITIES.includes(priority)) {
      return next(new AppError('Invalid priority', 400));
    }

    let againstFlat;
    if (againstFlatNumber && String(againstFlatNumber).trim()) {
      const target = String(againstFlatNumber).trim();
      if (toFlatKey(resident.flatNumber) === toFlatKey(target)) {
        return next(new AppError('You cannot raise a complaint against your own flat', 400));
      }
      const flat = await Flat.findOne({ apartmentId: resident.apartmentId, flatKey: toFlatKey(target) });
      if (!flat) return next(new AppError(`Flat ${target} was not found in your apartment`, 400));
      againstFlat = flat.flatNumber;
    }

    const complaint = await Complaint.create({
      apartmentId: resident.apartmentId,
      flatId: resident.flatId?._id || resident.flatId,
      flatNumber: resident.flatNumber,
      residentName: resident.name,
      residentId: resident._id,
      raisedBy: 'resident',
      category,
      priority,
      description: String(description).trim(),
      againstFlatNumber: againstFlat,
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted. The society admin will review it shortly.',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};
