"use strict";
const Indicator = require('../models/indicator.model');
const {ROLES, POSITIONS} =require('../configs/enum')


const checkLeaderPermission = (req, res, nextOrCallback) => {
  const user = req.user;
  if (!user) {
    return res.status(403).json({ success: false, message: 'Người dùng không có quyền truy cập' });
  }
  // Sửa lại điều kiện: chỉ chặn nếu KHÔNG phải admin VÀ cũng KHÔNG phải lãnh đạo
  if (user.role !== 'admin' && !POSITIONS.slice(0,2).includes(user.position)) {
    return res.status(403).json({ success: false, message: 'Chỉ lãnh đạo mới có quyền thực hiện hành động này' });
  }
  // Nếu truyền callback thì gọi callback, nếu không thì gọi next()
  if (typeof nextOrCallback === 'function') {
    return nextOrCallback();
  }
};

const checkOverdueStatus = async (req, res, next) => {
  const now = new Date();
  try {
    // Bulk update thay vì lặp từng indicator
    await Indicator.updateMany(
      { status: 'active', endDate: { $lt: now } },
      { $set: { status: 'overdue', isOverdue: true } }
    );
    next();
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái quá hạn:', error);
    next();
  }
};

module.exports = {checkLeaderPermission, checkOverdueStatus};