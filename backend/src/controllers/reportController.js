const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Expense = require('../models/Expense');
const Complaint = require('../models/Complaint');
const Flat = require('../models/Flat');
const AppError = require('../utils/AppError');

function toObjId(id) {
  return new mongoose.Types.ObjectId(id);
}

function getApartmentId(req) {
  return req.query.apartmentId || req.admin.apartmentId;
}

exports.financialReport = async (req, res, next) => {
  try {
    const apartmentId = getApartmentId(req);
    if (!apartmentId) return next(new AppError('apartmentId not found', 400));
    const { year } = req.query;

    const expFilter = { apartmentId: toObjId(apartmentId) };
    const billFilter = { apartmentId: toObjId(apartmentId) };
    if (year) {
      expFilter.year = Number(year);
      billFilter.billingMonth = { $regex: `^${year}-` };
    }

    const [expenseAgg, billAgg] = await Promise.all([
      Expense.aggregate([
        { $match: expFilter },
        { $group: { _id: null, totalExpenses: { $sum: '$amount' }, totalPaid: { $sum: '$paidAmount' } } }
      ]),
      Bill.aggregate([
        { $match: billFilter },
        { $group: { _id: null, totalBilled: { $sum: '$amount' }, totalCollected: { $sum: '$paidAmount' }, totalPenalty: { $sum: '$penalty' } } }
      ])
    ]);

    const expenses = expenseAgg[0] || { totalExpenses: 0, totalPaid: 0 };
    const billing = billAgg[0] || { totalBilled: 0, totalCollected: 0, totalPenalty: 0 };

    res.json({
      success: true,
      data: {
        totalCollected: billing.totalCollected,
        totalExpenses: expenses.totalExpenses,
        netBalance: billing.totalCollected - expenses.totalExpenses,
        totalBilled: billing.totalBilled,
        totalPenalty: billing.totalPenalty
      }
    });
  } catch (error) { next(error); }
};

exports.collectionsReport = async (req, res, next) => {
  try {
    const apartmentId = getApartmentId(req);
    if (!apartmentId) return next(new AppError('apartmentId not found', 400));

    const [monthly, statusBreakdown] = await Promise.all([
      Bill.aggregate([
        { $match: { apartmentId: toObjId(apartmentId) } },
        {
          $group: {
            _id: '$billingMonth',
            totalBilled: { $sum: '$amount' },
            totalCollected: { $sum: '$paidAmount' },
            count: { $sum: 1 },
            paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
            partial: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Bill.aggregate([
        { $match: { apartmentId: toObjId(apartmentId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.json({ success: true, data: { monthly, statusBreakdown } });
  } catch (error) { next(error); }
};

exports.expensesReport = async (req, res, next) => {
  try {
    const apartmentId = getApartmentId(req);
    if (!apartmentId) return next(new AppError('apartmentId not found', 400));
    const { year } = req.query;

    const match = { apartmentId: toObjId(apartmentId) };
    if (year) match.year = Number(year);

    const [byCategory, monthly] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: { year: '$year', month: '$month' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    res.json({ success: true, data: { byCategory, monthly } });
  } catch (error) { next(error); }
};

exports.complaintsReport = async (req, res, next) => {
  try {
    const apartmentId = getApartmentId(req);
    if (!apartmentId) return next(new AppError('apartmentId not found', 400));

    const match = { apartmentId: toObjId(apartmentId) };

    const [byStatus, byCategory, byPriority, total] = await Promise.all([
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Complaint.countDocuments(match)
    ]);

    res.json({ success: true, data: { total, byStatus, byCategory, byPriority } });
  } catch (error) { next(error); }
};

exports.occupancyReport = async (req, res, next) => {
  try {
    const apartmentId = getApartmentId(req);
    if (!apartmentId) return next(new AppError('apartmentId not found', 400));

    const match = { apartmentId: toObjId(apartmentId) };

    const [byStatus, byType, total] = await Promise.all([
      Flat.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Flat.aggregate([{ $match: match }, { $group: { _id: '$occupationType', count: { $sum: 1 } } }]),
      Flat.countDocuments(match)
    ]);

    res.json({ success: true, data: { total, byStatus, byType } });
  } catch (error) { next(error); }
};
