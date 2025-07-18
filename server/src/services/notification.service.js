"use strict";
const Notification = require('../models/notification.model');

async function createNotification({ user, type, title, content, relatedId }) {
  return Notification.create({ user, type, title, content, relatedId });
}

async function getUserNotifications(userId, { limit = 20, skip = 0, unreadOnly = false } = {}) {
  const filter = { user: userId };
  if (unreadOnly) filter.isRead = false;
  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

async function markAsRead(notificationId, userId) {
  return Notification.updateOne({ _id: notificationId, user: userId }, { $set: { isRead: true } });
}

async function deleteNotification(notificationId, userId) {
  return Notification.deleteOne({ _id: notificationId, user: userId });
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  deleteNotification,
}; 