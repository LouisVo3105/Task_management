const jwt = require('jsonwebtoken');
const Task = require('../models/task.model');
const mongoose = require('mongoose');

const tokenBlacklist = new Set();

const verifyRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid refresh token' });
    req.user = user;
    next();
  });
};

const roleMiddleware = (roles) => (req, res, next) => {
  if (!roles || !Array.isArray(roles)) {
    return res.status(500).json({ success: false, message: 'Cấu hình middleware roleMiddleware sai' });
  }
  if (!req.user || !req.user.role) {
    return res.status(401).json({ success: false, message: 'Chưa xác thực hoặc thiếu thông tin quyền' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  }
  next();
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: 'Token revoked' });
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Phân biệt các loại lỗi token
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Malformed token';
    }
    
    res.status(401).json({ 
      success: false, 
      message 
    });
  }
};

const canManageTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const taskId = req.params.id;
    
    // Admin và Director có toàn quyền thao tác với tất cả nhiệm vụ
    if (userRole === 'admin' || userRole === 'director') return next();

    // Tìm task chính
    let task = await Task.findById(taskId).select('leader');
    // Nếu không có, tìm task cha chứa subtask
    if (!task) {
      task = await Task.findOne({ 'subTasks._id': new mongoose.Types.ObjectId(taskId) }).select('leader');
      if (!task) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });
      }
    }
    if (task.leader && task.leader.toString() === userId) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với nhiệm vụ này' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền', error: error.message });
  }
};

module.exports = {authMiddleware, verifyRefreshToken, tokenBlacklist, roleMiddleware, canManageTask};