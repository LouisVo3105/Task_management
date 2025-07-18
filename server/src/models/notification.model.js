"use strict";
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true }, // 'main_task_deadline_soon', 'subtask_deadline_soon', 'indicator_deadline_soon', ...
  title: String,
  content: String,
  relatedId: { type: String }, // taskId, subtaskId, indicatorId
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema); 