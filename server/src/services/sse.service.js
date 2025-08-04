"use strict";
require('dotenv').config();
const jwt = require('jsonwebtoken');
const Task = require('../models/task.model');
const Indicator = require('../models/indicator.model');
const { createNotification } = require('./notification.service');
const fs = require('fs');
const path = require('path');
const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, 'sse.txt');
const mongoose = require('mongoose');


/**
 * SSE (Server-Sent Events) Service
 * 
 * This service manages real-time notifications for users via SSE.
 * 
 * Key responsibilities:
 * - Handles client connections for SSE and manages a list of connected clients per user.
 * - Authenticates users using JWT tokens from headers or cookies.
 * - Sends real-time notifications, such as overdue task alerts, to connected users.
 * - Logs connection events and notification activities to a log file.
 * - Integrates with the notification service to create and dispatch notifications.
 * 
 * Exposed API:
 * - registerSSE(app): Registers the SSE endpoint on the provided Express app.
 * 
 * Internal utilities:
 * - getVNDateString(date): Formats a date string in Vietnamese locale.
 * - logToFile(message): Appends log messages to a file.
 * 
 * Data structures:
 * - sseClients: Keeps track of active SSE connections per user.
 * - lastNotified: Tracks the last notification time for each user-task combination to avoid spamming.
 * 
 * Environment variables:
 * - JWT_SECRET: Used to verify JWT tokens.
 * - CLIENT_URL: Allowed origin for CORS headers.
 */




function getVNDateString(date) {
  return date.toLocaleString('vi-VN', { hour12: false });
}
function logToFile(message) {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.appendFileSync(logFile, message + '\n');
}

const sseClients = {}; // { userId: [res, ...] }
const lastNotified = {}; // { [userId_taskType_taskId]: lastNotifyDate }
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT;


function registerSSE(app) {
  // SSE endpoint
  app.get('/api/sse', (req, res) => {
    // Lấy token từ header hoặc cookie
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (!token) return res.status(401).end();

    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      return res.status(401).end();
    }

    // Bổ sung các header CORS cho SSE
    res.setHeader('Access-Control-Allow-Origin', CLIENT_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!sseClients[userId]) sseClients[userId] = [];
    sseClients[userId].push(res);

    logToFile(`[SSE] User ${userId} connected at ${getVNDateString(new Date())}`);

    // Gửi thông báo nhiệm vụ quá hạn cho user ngay khi kết nối
    sendOverdueNotificationsForUser(userId);

    // Delay gửi notification tổng quan 3 giây sau khi user kết nối
    setTimeout(() => {
      sendIncompleteTasksCount(userId);
      sendPendingApprovalTasksCount(userId);
      // Có thể bổ sung các notification tổng quan khác ở đây nếu cần
    }, 3000);

    const keepAlive = setInterval(() => {
      res.write(':keep-alive\n\n');
      if (res.flush) res.flush();
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      if (sseClients[userId]) {
        sseClients[userId] = sseClients[userId].filter(r => r !== res);
        if (sseClients[userId].length === 0) delete sseClients[userId];
      }
      res.end();
      logToFile(`[SSE] User ${userId} disconnected at ${getVNDateString(new Date())}`);
    });
  });
}

function broadcastSSE(event, data) {
  Object.values(sseClients).flat().forEach(res => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (res.flush) res.flush();
  });
}

/**
 * Gửi SSE toast notification cho 1 user cụ thể
 * @param {string} userId
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {string} message
 * @param {object} [data]
 */
function sendSseToastToUser(userId, type, message, data = {}) {
  if (!sseClients[userId]) return;
  const payload = { type, message, ...data };
  sseClients[userId].forEach(res => {
    res.write(`event: toast\ndata: ${JSON.stringify(payload)}\n\n`);
    if (res.flush) res.flush();
  });
  logToFile(`[SSE] Toast to user ${userId}: ${type} - ${message}`);
}

/**
 * Gửi SSE toast notification cho tất cả user
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {string} message
 * @param {object} [data]
 */
function broadcastSseToast(type, message, data = {}) {
  const payload = { type, message, ...data };
  Object.entries(sseClients).forEach(([userId, resArr]) => {
    resArr.forEach(res => {
      res.write(`event: toast\ndata: ${JSON.stringify(payload)}\n\n`);
      if (res.flush) res.flush();
    });
  });
  logToFile(`[SSE] Toast broadcast: ${type} - ${message}`);
}

/**
 * Gửi số nhiệm vụ chưa hoàn thành cho user
 * @param {string} userId
 */
async function sendIncompleteTasksCount(userId) {
  const Task = require('../models/task.model');
  // Nhiệm vụ chính user là leader, chưa hoàn thành
  const mainCount = await Task.countDocuments({ leader: userId, status: { $in: ['pending', 'submitted'] } });
  // Subtask user là assignee, chưa hoàn thành
  const subCount = await Task.aggregate([
    { $unwind: '$subTasks' },
    { $match: { 'subTasks.assignee': new mongoose.Types.ObjectId(userId), 'subTasks.status': { $in: ['pending', 'submitted'] } } },
    { $count: 'count' }
  ]);
  const total = mainCount + (subCount[0]?.count || 0);
  if (sseClients[userId]) {
    sseClients[userId].forEach(res => {
      res.write(`event: tasks_incomplete_count\ndata: ${JSON.stringify({ count: total })}\n\n`);
      if (res.flush) res.flush();
    });
    logToFile(`[SSE] Incomplete tasks count to user ${userId}: ${total}`);
  }
}

/**
 * Gửi số nhiệm vụ chờ duyệt cho user
 * @param {string} userId
 */
async function sendPendingApprovalTasksCount(userId) {
  const Task = require('../models/task.model');
  // Nhiệm vụ chính user là leader, chờ duyệt
  const mainCount = await Task.countDocuments({ leader: userId, status: 'submitted' });
  // Subtask user là assignee, chờ duyệt
  const subCount = await Task.aggregate([
    { $unwind: '$subTasks' },
    { $match: { 'subTasks.assignee': new mongoose.Types.ObjectId(userId), 'subTasks.status': 'submitted' } },
    { $count: 'count' }
  ]);
  const total = mainCount + (subCount[0]?.count || 0);
  if (sseClients[userId]) {
    sseClients[userId].forEach(res => {
      res.write(`event: tasks_pending_approval_count\ndata: ${JSON.stringify({ count: total })}\n\n`);
      if (res.flush) res.flush();
    });
    logToFile(`[SSE] Pending approval tasks count to user ${userId}: ${total}`);
  }
}

/**
 * Gửi thông báo nhiệm vụ/subtask được duyệt/từ chối
 * @param {string} userId
 * @param {'approved'|'rejected'} status
 * @param {object} taskData
 *   - type: 'main'|'subtask'
 *   - taskId, subTaskId, title, ...
 */
function sendTaskApprovalResult(userId, status, taskData) {
  const event = taskData.type === 'main'
    ? (status === 'approved' ? 'task_approved' : 'task_rejected')
    : (status === 'approved' ? 'subtask_approved' : 'subtask_rejected');
  const message = taskData.type === 'main'
    ? `Nhiệm vụ "${taskData.title}" đã được ${status === 'approved' ? 'duyệt' : 'từ chối'}!`
    : `Nhiệm vụ con "${taskData.title}" đã được ${status === 'approved' ? 'duyệt' : 'từ chối'}!`;
  if (sseClients[userId]) {
    sseClients[userId].forEach(res => {
      res.write(`event: ${event}\ndata: ${JSON.stringify({ ...taskData, status, message })}\n\n`);
      if (res.flush) res.flush();
    });
    logToFile(`[SSE] ${event} to user ${userId}: ${message}`);
  }
}

// Thêm hàm mới gửi thông báo quá hạn cho user khi kết nối SSE
async function sendOverdueNotificationsForUser(userId) {
  const now = new Date();
  const Task = require('../models/task.model');
  // Nhiệm vụ chính quá hạn, chưa thông báo
  const mainTasks = await Task.find({
    leader: userId,
    status: 'overdue',
    endDate: { $lt: now },
    overdueNotified: { $ne: true }
  });
  for (const task of mainTasks) {
    const notifyData = {
      type: 'main_task_overdue',
      taskId: task._id,
      title: task.title,
      deadline: task.endDate
    };
    broadcastSSE('main_task_overdue', notifyData);
    // Đánh dấu đã gửi
    task.overdueNotified = true;
    await task.save();
  }

  // Subtask quá hạn, chưa thông báo
  const tasks = await Task.find({
    'subTasks.assignee': userId,
    'subTasks.status': 'overdue',
    'subTasks.endDate': { $lt: now }
  });
  for (const task of tasks) {
    let updated = false;
    for (const sub of task.subTasks) {
      if (
        sub.assignee?.toString() === userId &&
        sub.status === 'overdue' &&
        sub.endDate < now &&
        !sub.overdueNotified
      ) {
        const notifyData = {
          type: 'subtask_overdue',
          subtaskId: sub._id,
          title: sub.title,
          deadline: sub.endDate
        };
        broadcastSSE('subtask_overdue', notifyData);
        sub.overdueNotified = true;
        updated = true;
      }
    }
    if (updated) await task.save();
  }
}

// Định kỳ kiểm tra và gửi thông báo deadline
async function checkAndNotifyDeadlines() {
  const now = new Date();
  const users = Object.keys(sseClients);
  for (const userId of users) {
    // 1. Subtasks: user là assignee
    const tasks = await Task.find({
      $or: [
        { leader: userId },
        { 'subTasks.assignee': userId }
      ]
    }).select('title endDate subTasks leader status overdueNotified');
    // Main tasks (leader)
    for (const task of tasks) {
      // Main task - leader
      const isMainTaskOverdue = (task.endDate < now) && (task.status === 'overdue') && !task.overdueNotified;
      if (task.leader && task.leader.toString() === userId) {
        const daysToDeadline = Math.ceil((task.endDate - now) / (24 * 60 * 60 * 1000));
        if (daysToDeadline <= 7 && daysToDeadline >= 0) {
          // Sắp tới hạn
          const key = `${userId}_main_${task._id}`;
          const last = lastNotified[key];
          if (!last || (now - last) >= 3 * 24 * 60 * 60 * 1000) {
            const notifyData = {
              type: 'main_task_deadline_soon',
              taskId: task._id,
              title: task.title,
              deadline: task.endDate,
              daysToDeadline
            };
            broadcastSSE('main_task_deadline_soon', notifyData);
            await createNotification({
              user: userId,
              type: notifyData.type,
              title: notifyData.title,
              content: `Nhiệm vụ chính "${notifyData.title}" sắp đến hạn (${notifyData.daysToDeadline} ngày nữa)!`,
              relatedId: notifyData.taskId
            });
            lastNotified[key] = now;
          }
        }
        // Quá hạn: chỉ gửi 1 lần
        if (isMainTaskOverdue) {
          const notifyData = {
            type: 'main_task_overdue',
            taskId: task._id,
            title: task.title,
            deadline: task.endDate
          };
          broadcastSSE('main_task_overdue', notifyData);
          await createNotification({
            user: userId,
            type: notifyData.type,
            title: notifyData.title,
            content: `Nhiệm vụ chính "${notifyData.title}" đã quá hạn!`,
            relatedId: notifyData.taskId
          });
          // Đánh dấu đã gửi thông báo quá hạn
          task.overdueNotified = true;
          await task.save();
        }
      }
      // Subtasks - assignee
      if (Array.isArray(task.subTasks)) {
        for (const sub of task.subTasks) {
          const isSubtaskOverdue = (sub.endDate < now) && (sub.status === 'overdue') && !sub.overdueNotified;
          if (sub.assignee && sub.assignee.toString() === userId) {
            const daysToDeadline = Math.ceil((sub.endDate - now) / (24 * 60 * 60 * 1000));
            if (daysToDeadline <= 7 && daysToDeadline >= 0) {
              // Sắp tới hạn
              const key = `${userId}_sub_${sub._id}`;
              const last = lastNotified[key];
              if (!last || (now - last) >= 3 * 24 * 60 * 60 * 1000) {
                const notifyData = {
                  type: 'subtask_deadline_soon',
                  subtaskId: sub._id,
                  title: sub.title,
                  deadline: sub.endDate,
                  daysToDeadline
                };
                broadcastSSE('subtask_deadline_soon', notifyData);
                await createNotification({
                  user: userId,
                  type: notifyData.type,
                  title: notifyData.title,
                  content: `Subtask "${notifyData.title}" sắp đến hạn (${notifyData.daysToDeadline} ngày nữa)!`,
                  relatedId: notifyData.subtaskId
                });
                lastNotified[key] = now;
              }
            }
            // Quá hạn: chỉ gửi 1 lần
            if (isSubtaskOverdue) {
              const notifyData = {
                type: 'subtask_overdue',
                subtaskId: sub._id,
                title: sub.title,
                deadline: sub.endDate
              };
              broadcastSSE('subtask_overdue', notifyData);
              await createNotification({
                user: userId,
                type: notifyData.type,
                title: notifyData.title,
                content: `Subtask "${notifyData.title}" đã quá hạn!`,
                relatedId: notifyData.subtaskId
              });
              // Đánh dấu đã gửi thông báo quá hạn
              sub.overdueNotified = true;
              await task.save();
            }
          }
          // Nếu subtask quá hạn, gửi cho leader (nếu khác assignee)
          if (isSubtaskOverdue && task.leader && task.leader.toString() !== (sub.assignee && sub.assignee.toString())) {
            const leaderId = task.leader.toString();
            if (sseClients[leaderId]) {
              const notifyData = {
                type: 'subtask_overdue',
                subtaskId: sub._id,
                title: sub.title,
                deadline: sub.endDate
              };
              broadcastSSE('subtask_overdue', notifyData);
              await createNotification({
                user: leaderId,
                type: notifyData.type,
                title: notifyData.title,
                content: `Subtask "${notifyData.title}" đã quá hạn!`,
                relatedId: notifyData.subtaskId
              });
            }
          }
        }
      }
    }
    // 2. Indicator: user là creator
    const indicators = await Indicator.find({
      creator: userId
    }).select('name endDate');
    for (const ind of indicators) {
      const daysToDeadline = Math.ceil((ind.endDate - now) / (24 * 60 * 60 * 1000));
      if (daysToDeadline <= 7 && daysToDeadline >= 0) {
        const key = `${userId}_indicator_${ind._id}`;
        const last = lastNotified[key];
        if (!last || (now - last) >= 3 * 24 * 60 * 60 * 1000) {
          const notifyData = {
            type: 'indicator_deadline_soon',
            indicatorId: ind._id,
            name: ind.name,
            deadline: ind.endDate,
            daysToDeadline
          };
          broadcastSSE('indicator_deadline_soon', notifyData);
          await createNotification({
            user: userId,
            type: notifyData.type,
            title: notifyData.name,
            content: `Indicator "${notifyData.name}" sắp đến hạn (${notifyData.daysToDeadline} ngày nữa)!`,
            relatedId: notifyData.indicatorId
          });
          lastNotified[key] = now;
        }
      }
    }
  }
}

// Định kỳ mỗi giờ
setInterval(checkAndNotifyDeadlines, 60 * 60 * 1000);

module.exports = {
  registerSSE,
  broadcastSSE,
  sendSseToastToUser,
  broadcastSseToast,
  sendIncompleteTasksCount,
  sendPendingApprovalTasksCount,
  sendTaskApprovalResult
}; 