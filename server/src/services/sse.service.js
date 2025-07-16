const jwt = require('jsonwebtoken');
const Task = require('../models/task.model');
const Indicator = require('../models/indicator.model');
const { createNotification } = require('./notification.service');

const sseClients = {}; // { userId: [res, ...] }
const lastNotified = {}; // { [userId_taskType_taskId]: lastNotifyDate }
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret';

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
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!sseClients[userId]) sseClients[userId] = [];
    sseClients[userId].push(res);

    console.log(`[SSE] User ${userId} connected at ${new Date().toISOString()}`);

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
      console.log(`[SSE] User ${userId} disconnected at ${new Date().toISOString()}`);
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

module.exports = { registerSSE, broadcastSSE }; 