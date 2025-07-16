const Indicator = require('../models/indicator.model');

const checkLeaderPermission = (req, res, nextOrCallback) => {
  const user = req.user;
  console.log('checkLeaderPermission - user:', user); // DEBUG LOG
  if (!user) {
    return res.status(403).json({ success: false, message: 'Người dùng không có quyền truy cập' });
  }
  // Sửa lại điều kiện: chỉ chặn nếu KHÔNG phải admin VÀ cũng KHÔNG phải lãnh đạo
  if (user.role !== 'admin' && !['Giam doc', 'Pho Giam doc'].includes(user.position)) {
    return res.status(403).json({ success: false, message: 'Chỉ lãnh đạo mới có quyền thực hiện hành động này' });
  }
  // Nếu truyền callback thì gọi callback, nếu không thì gọi next()
  if (typeof nextOrCallback === 'function') {
    return nextOrCallback();
  }
  if (typeof next === 'function') {
    return next();
  }
};

const checkOverdueStatus = async (req, res, next) => {
  const now = new Date();
  try {
    const indicators = await Indicator.find();
    for (let indicator of indicators) {
      if (indicator.status === 'active' && indicator.endDate < now) {
        indicator.status = 'overdue';
        indicator.isOverdue = true;
        await indicator.save();
      }
    }
    next();
  } catch (error) {
    console.error('Lỗi khi kiểm tra trạng thái quá hạn:', error);
    next();
  }
};

module.exports = {checkLeaderPermission, checkOverdueStatus};