const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

exports.listNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ adminId: req.admin._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (error) { next(error); }
};

exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, adminId: req.admin._id });
    if (!notification) return next(new AppError('Notification not found', 404));

    notification.isRead = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (error) { next(error); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ adminId: req.admin._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

exports.createNotification = async (adminId, apartmentId, type, title, message, opts = {}) => {
  try {
    return await Notification.create({ adminId, apartmentId, type, title, message, ...opts });
  } catch (_) {}
};
