const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Flat = require('../models/Flat');
const AppError = require('../utils/AppError');

exports.listPayments = async (req, res, next) => {
  try {
    const { flatId, billingMonth, status, billId } = req.query;
    const apartmentId = req.query.apartmentId || req.admin.apartmentId;
    const filter = {};
    if (apartmentId) filter.apartmentId = apartmentId;
    if (flatId) filter.flatId = flatId;
    if (billingMonth) filter.billingMonth = billingMonth;
    if (status) filter.status = status;
    if (billId) filter.billId = billId;

    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) { next(error); }
};

exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(new AppError('Payment not found', 404));
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
};

exports.createPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));

    const { billId, paidAmount, paymentMethod, transactionId, remarks } = req.body;

    const bill = await Bill.findById(billId);
    if (!bill) return next(new AppError('Bill not found', 404));

    const newPaid = bill.paidAmount + Number(paidAmount);
    const total = bill.amount + bill.penalty;
    const balance = Math.max(0, total - newPaid);

    bill.paidAmount = newPaid;
    bill.paymentMethod = paymentMethod;
    bill.paidDate = new Date();
    if (newPaid >= total) {
      bill.status = 'paid';
    } else if (newPaid > 0) {
      bill.status = 'partial';
    }
    await bill.save();

    // Update Flat dues so resident dues show 0 or reduced balance immediately
    if (bill.flatId) {
      const flat = await Flat.findById(bill.flatId);
      if (flat) {
        if (!flat.dues) flat.dues = {};
        flat.dues.pendingDueAmount = Math.max(0, (flat.dues.pendingDueAmount || 0) - Number(paidAmount));
        flat.dues.totalDueAmount = Math.max(0, (flat.dues.totalDueAmount || 0) - Number(paidAmount));
        await flat.save();
      }
    }

    const payment = await Payment.create({
      apartmentId: bill.apartmentId,
      flatId: bill.flatId,
      billId: bill._id,
      flatNumber: bill.flatNumber,
      ownerName: bill.ownerName,
      billingMonth: bill.billingMonth,
      totalAmount: total,
      paidAmount: Number(paidAmount),
      balanceAmount: balance,
      paymentMethod,
      transactionId,
      remarks,
      status: balance === 0 ? 'paid' : 'partial',
      receivedBy: req.admin._id
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error) { next(error); }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(new AppError('Payment not found', 404));
    Object.assign(payment, req.body);
    await payment.save();
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
};

exports.getDefaulters = async (req, res, next) => {
  try {
    const apartmentId = req.query.apartmentId || req.admin.apartmentId;
    const filter = { status: { $in: ['overdue', 'pending'] } };
    if (apartmentId) filter.apartmentId = apartmentId;

    const defaulterBills = await Bill.find(filter).sort({ dueDate: 1 });
    res.json({ success: true, data: defaulterBills });
  } catch (error) { next(error); }
};

// Admin: Get all payments pending verification (with uploaded screenshots)
exports.getPendingVerifications = async (req, res, next) => {
  try {
    const apartmentId = req.query.apartmentId || req.admin?.apartmentId;
    const filter = { status: 'pending_verification' };
    if (apartmentId) filter.apartmentId = apartmentId;

    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};

// Admin: Verify payment (Approve or Reject with screenshot review)
exports.verifyPayment = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body; // 'approve' | 'reject'
    if (!action || !['approve', 'reject'].includes(action)) {
      return next(new AppError("Action must be 'approve' or 'reject'", 400));
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(new AppError('Payment not found', 404));

    if (action === 'approve') {
      payment.status = 'paid';
      payment.verifiedBy = req.admin?._id;
      payment.verifiedAt = new Date();
      await payment.save();

      // Update associated bill
      if (payment.billId) {
        const bill = await Bill.findById(payment.billId);
        if (bill) {
          const newPaid = (bill.paidAmount || 0) + payment.paidAmount;
          const total = (bill.amount || 0) + (bill.penalty || 0);
          bill.paidAmount = newPaid;
          bill.paidDate = payment.paymentDate || new Date();
          bill.paymentMethod = payment.paymentMethod;
          bill.transactionId = payment.transactionId;
          bill.status = newPaid >= total ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
          await bill.save();
        }
      }

      // Update associated flat dues
      if (payment.flatId) {
        const flat = await Flat.findById(payment.flatId);
        if (flat && flat.dues) {
          flat.dues.pendingDueAmount = Math.max(0, (flat.dues.pendingDueAmount || 0) - payment.paidAmount);
          flat.dues.totalDueAmount = Math.max(0, (flat.dues.totalDueAmount || 0) - payment.paidAmount);
          await flat.save();
        }
      }

      return res.json({
        success: true,
        message: 'Payment verified and approved successfully! Bill and flat dues updated.',
        data: payment,
      });
    } else {
      // Reject
      payment.status = 'rejected';
      payment.rejectionReason = rejectionReason || 'Payment screenshot could not be verified.';
      payment.verifiedBy = req.admin?._id;
      payment.verifiedAt = new Date();
      await payment.save();

      return res.json({
        success: true,
        message: 'Payment verification rejected.',
        data: payment,
      });
    }
  } catch (error) {
    next(error);
  }
};
