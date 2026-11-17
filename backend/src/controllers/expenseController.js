const { validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const AppError = require('../utils/AppError');

exports.createExpense = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array().map(e=>e.msg).join(', '), 400));
    const payload = { ...req.body, createdBy: req.admin._id };
    const expense = await Expense.create(payload);
    res.status(201).json({ success: true, data: expense });
  } catch (error) { next(error); }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return next(new AppError('Expense not found', 404));

    // If paid, only allow remarks update
    if (expense.paymentStatus === 'paid') {
      expense.remarks = req.body.remarks || expense.remarks;
      await expense.save();
      return res.json({ success: true, data: expense });
    }

    Object.assign(expense, req.body);
    await expense.save();
    res.json({ success: true, data: expense });
  } catch (error) { next(error); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return next(new AppError('Expense not found', 404));
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) { next(error); }
};

exports.getExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return next(new AppError('Expense not found', 404));
    res.json({ success: true, data: expense });
  } catch (error) { next(error); }
};

exports.listExpenses = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const apartmentId = req.query.apartmentId || req.admin.apartmentId;
    const filter = {};
    if (apartmentId) filter.apartmentId = apartmentId;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const expenses = await Expense.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: expenses });
  } catch (error) { next(error); }
};

exports.summary = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const apartmentId = req.query.apartmentId || req.admin.apartmentId;
    const match = {};
    if (apartmentId) match.apartmentId = apartmentId;
    if (year) match.year = Number(year);
    if (month) match.month = Number(month);

    const agg = await Expense.aggregate([
      { $match: match },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' }, totalPaid: { $sum: '$paidAmount' } } }
    ]);

    const result = agg[0] || { totalExpenses: 0, totalPaid: 0 };
    const remainingBalance = result.totalExpenses - result.totalPaid;

    res.json({ success: true, data: { totalExpenses: result.totalExpenses, totalPaid: result.totalPaid, remainingBalance } });
  } catch (error) { next(error); }
};
