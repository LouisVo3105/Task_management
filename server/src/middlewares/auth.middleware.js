"use strict";
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

function roleMiddleware(roles) {
  return (req, res, next) => {
    next();
  }
}

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

    // Ưu tiên quyền admin, giám đốc
    if (userRole === 'admin') return next();
    if (req.user && req.user.position === 'Giam doc') return next();

    // Xác định taskId phù hợp cho từng loại route
    const taskId = req.params.id || req.params.taskId;

    // Tìm task chính
    let task = await Task.findById(taskId).select('leader subTasks');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });
    }

    // Nếu là thao tác trên subtask
    if (req.params.subTaskId) {
      const subTask = task.subTasks.id(req.params.subTaskId);
      if (!subTask) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ con' });
      }
      // Chủ trì subtask hoặc chủ trì task cha đều có quyền
      if (
        (subTask.leader && subTask.leader.toString() === userId) ||
        (task.leader && task.leader.toString() === userId)
      ) {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với nhiệm vụ con này' });
    }

    // Nếu là thao tác trên task chính
    if (task.leader && task.leader.toString() === userId) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Bạn không có quyền thao tác với nhiệm vụ này' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền', error: error.message });
  }
};

module.exports = {authMiddleware, verifyRefreshToken, tokenBlacklist, roleMiddleware, canManageTask};