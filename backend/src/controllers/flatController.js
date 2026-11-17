const { validationResult } = require('express-validator');
const Flat = require('../models/Flat');
const CommitteeMember = require('../models/CommitteeMember');
const AppError = require('../utils/AppError');

exports.listFlats = async (req, res, next) => {
  try {
    const apartmentId = req.query.apartmentId || req.admin.apartmentId;
    const filter = {};
    if (apartmentId) filter.apartmentId = apartmentId;
    const flats = await Flat.find(filter).sort({ flatNumber: 1 });
    res.json({ success: true, data: flats });
  } catch (error) { next(error); }
};

exports.createFlat = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array().map(e=>e.msg).join(', '), 400));
    const flat = await Flat.create(req.body);
    res.status(201).json({ success: true, data: flat });
  } catch (error) { next(error); }
};

exports.getFlat = async (req, res, next) => {
  try {
    const flat = await Flat.findById(req.params.id);
    if (!flat) return next(new AppError('Flat not found', 404));
    res.json({ success: true, data: flat });
  } catch (error) { next(error); }
};

exports.updateFlat = async (req, res, next) => {
  try {
    const flat = await Flat.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!flat) return next(new AppError('Flat not found', 404));
    res.json({ success: true, data: flat });
  } catch (error) { next(error); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // occupied or vacant
    const flat = await Flat.findById(req.params.id);
    if (!flat) return next(new AppError('Flat not found', 404));
    flat.status = status;
    await flat.save();
    res.json({ success: true, data: flat });
  } catch (error) { next(error); }
};

exports.shareFlat = async (req, res, next) => {
  try {
    const flat = await Flat.findById(req.params.id).select('-__v');
    if (!flat) return next(new AppError('Flat not found', 404));
    // simple shareable payload
    res.json({ success: true, data: flat });
  } catch (error) { next(error); }
};

exports.deleteFlat = async (req, res, next) => {
  try {
    const flat = await Flat.findByIdAndDelete(req.params.id);
    if (!flat) return next(new AppError('Flat not found', 404));
    await CommitteeMember.deleteMany({ flatId: flat._id });
    res.json({ success: true, message: 'Flat deleted' });
  } catch (error) { next(error); }
};
