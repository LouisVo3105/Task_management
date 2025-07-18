"use strict";
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification.service');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret';

// Middleware xác thực đơn giản (có thể thay bằng middleware auth chuẩn của bạn)
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Lấy danh sách thông báo
router.get('/', authMiddleware, async (req, res) => {
  const { limit, skip, unreadOnly } = req.query;
  const notifications = await notificationService.getUserNotifications(
    req.user.id,
    {
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0,
      unreadOnly: unreadOnly === 'true',
    }
  );
  res.json({ success: true, data: notifications });
});

// Đánh dấu đã đọc
router.post('/:id/read', authMiddleware, async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.id);
  res.json({ success: true });
});

// Xóa thông báo
router.delete('/:id', authMiddleware, async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router; 