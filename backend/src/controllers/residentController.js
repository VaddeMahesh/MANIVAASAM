const Flat = require('../models/Flat');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');

// Get resident's flat profile & overview
exports.getMyFlat = async (req, res, next) => {
  try {
    const resident = req.resident;
    if (!resident) return next(new AppError('Resident authentication required', 401));

    const flat = await Flat.findById(resident.flatId || resident.flatId?._id).populate('apartmentId');
    if (!flat) return next(new AppError('Flat record not found', 404));

    // Get latest bill
    const latestBill = await Bill.findOne({
      $or: [{ flatId: flat._id }, { flatNumber: flat.flatNumber }]
    }).sort({ billingMonth: -1 });

    // Calculate pending dues accurately from all bills
    const allBills = await Bill.find({
      $or: [{ flatId: flat._id }, { flatNumber: flat.flatNumber }]
    });

    const pendingTotal = allBills.reduce((sum, b) => {
      if (b.status === 'paid') return sum;
      const due = (b.amount || 0) + (b.penalty || 0) - (b.paidAmount || 0);
      return sum + Math.max(0, due);
    }, 0);

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
          apartmentName: flat.apartmentId?.apartmentName || 'Apartment Society'
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

    const bills = await Bill.find({
      $or: [
        { flatId: resident.flatId },
        { flatNumber: resident.flatNumber }
      ]
    }).sort({ billingMonth: -1 });

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

    const payments = await Payment.find({
      $or: [
        { flatId: resident.flatId },
        { flatNumber: resident.flatNumber },
        { residentId: resident._id }
      ]
    }).sort({ createdAt: -1 });

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
