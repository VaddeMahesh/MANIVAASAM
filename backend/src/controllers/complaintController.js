const { validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const AppError = require('../utils/AppError');

exports.listComplaints = async (req, res, next) => {
  try {
    const { status, priority, flatId } = req.query;
    const apartmentId = req.query.apartmentId || req.admin.apartmentId;
    const filter = {};
    if (apartmentId) filter.apartmentId = apartmentId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (flatId) filter.flatId = flatId;

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (error) { next(error); }
};

exports.getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError('Complaint not found', 404));
    res.json({ success: true, data: complaint });
  } catch (error) { next(error); }
};

exports.createComplaint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array().map(e => e.msg).join(', '), 400));

    const apartmentId = req.body.apartmentId || req.admin.apartmentId;
    const payload = { ...req.body, apartmentId, createdBy: req.admin._id };
    const complaint = await Complaint.create(payload);
    res.status(201).json({ success: true, data: complaint });
  } catch (error) { next(error); }
};

exports.updateComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError('Complaint not found', 404));

    const { status, assignedTo, resolution } = req.body;

    Object.assign(complaint, req.body);

    if (status === 'resolved' && !complaint.resolvedAt) {
      complaint.resolvedAt = new Date();
      if (resolution) complaint.resolution = resolution;
    }

    await complaint.save();
    res.json({ success: true, data: complaint });
  } catch (error) { next(error); }
};

exports.deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) return next(new AppError('Complaint not found', 404));
    res.json({ success: true, message: 'Complaint deleted' });
  } catch (error) { next(error); }
};

exports.addComment = async (req, res, next) => {
  try {
    const { message, author } = req.body;
    if (!message || !message.trim()) return next(new AppError('Comment message is required', 400));

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return next(new AppError('Complaint not found', 404));

    complaint.comments.push({
      author: author || `${req.admin.firstName} ${req.admin.lastName}`,
      message: message.trim(),
      timestamp: new Date()
    });

    await complaint.save();
    res.json({ success: true, data: complaint });
  } catch (error) { next(error); }
};
