"use strict";
const Indicator = require('../models/indicator.model');
const Task = require('../models/task.model');
const Comment = require('../models/comment.model');
const fs = require('fs');

const createIndicator = async ({ name, endDate, creator }) => {
  const indicator = new Indicator({ name, endDate, creator });
  await indicator.save();
  return indicator;
};

const updateIndicator = async (id, updateData) => {
  const indicator = await Indicator.findByIdAndUpdate(id, updateData, { new: true });
  if (!indicator) {
    const err = new Error('Không tìm thấy chỉ tiêu');
    err.status = 404;
    throw err;
  }
  return indicator;
};

const deleteIndicator = async (id) => {
  const indicator = await Indicator.findByIdAndDelete(id);
  if (!indicator) {
    const err = new Error('Không tìm thấy chỉ tiêu');
    err.status = 404;
    throw err;
  }
  // Lấy tất cả task liên quan để xóa file
  const tasks = await Task.find({ indicator: id });
  for (const task of tasks) {
    if (task.file) {
      try { fs.unlinkSync(task.file); } catch (err) {}
    }
    if (task.submissions) {
      task.submissions.forEach(submission => {
        if (submission.file) {
          try { fs.unlinkSync(submission.file); } catch (err) {}
        }
      });
    }
    if (task.subTasks) {
      task.subTasks.forEach(subTask => {
        if (subTask.file) {
          try { fs.unlinkSync(subTask.file); } catch (err) {}
        }
        if (subTask.submissions) {
          subTask.submissions.forEach(submission => {
            if (submission.file) {
              try { fs.unlinkSync(submission.file); } catch (err) {}
            }
          });
        }
      });
    }
  }
  await Task.deleteMany({ indicator: id });
  await Comment.deleteMany({ indicatorId: id });
  return { indicatorId: id };
};

const getIndicators = async (page = 1, limit = 10) => {
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    select: 'name endDate _id createdAt'
  };
  const indicators = await Indicator.paginate({}, options);
  const indicatorsWithStatus = await Promise.all(
    indicators.docs.map(async (indicator) => {
      // Lấy tất cả task của chỉ tiêu
      const allTasks = await Task.find({ indicator: indicator._id }).select('status parentTask').lean();
      const rootTasks = allTasks.filter(t => !t.parentTask);
      const cloneTasks = allTasks.filter(t => t.parentTask);
      const rootTaskIdsWithClone = new Set(cloneTasks.map(t => t.parentTask?.toString()));
      const displayTasks = [
        ...cloneTasks,
        ...rootTasks.filter(t => !rootTaskIdsWithClone.has(t._id.toString()))
      ];
      let completedTasks = 0;
      let totalTasks = displayTasks.length;
      for (const task of displayTasks) {
        if (task.status === 'approved') completedTasks++;
      }
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      let overallStatus = 'not_started';
      if (totalTasks === 0) overallStatus = 'no_tasks';
      else if (completedTasks === totalTasks) overallStatus = 'completed';
      else if (totalTasks > 0) overallStatus = 'in_progress';
      return {
        ...indicator.toObject(),
        status: {
          completed: completedTasks,
          total: totalTasks,
          percentage: completionPercentage,
          overallStatus
        }
      };
    })
  );
  return { ...indicators, docs: indicatorsWithStatus };
};

const approveNewIndicator = async ({ oldIndicatorId, name, endDate, creator }) => {
  const oldIndicator = await Indicator.findById(oldIndicatorId);
  if (!oldIndicator || !oldIndicator.isOverdue) {
    const err = new Error('Chỉ tiêu cũ không tồn tại hoặc chưa quá hạn');
    err.status = 400;
    throw err;
  }
  const newIndicator = new Indicator({ name, endDate, creator });
  await newIndicator.save();
  oldIndicator.status = 'completed';
  await oldIndicator.save();
  return newIndicator;
};

const getIndicatorTasks = async (id) => {
  const indicator = await Indicator.findById(id).select('_id name endDate creator').lean();
  if (!indicator) {
    const err = new Error('Không tìm thấy chỉ tiêu');
    err.status = 404;
    throw err;
  }
  const tasks = await Task.find({ indicator: id })
    .select('title endDate _id status subTasks department createdAt parentTask')
    .populate({ path: 'department', select: '_id name' })
    .lean();
  // Thêm trường phân biệt nhiệm vụ gốc và nhiệm vụ clone
  tasks.forEach(task => {
    task.isRoot = !task.parentTask;
  });
  let completedTasks = 0;
  let totalTasks = 0;
  for (const task of tasks) {
    totalTasks++;
    if (task.status === 'approved') completedTasks++;
  }
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  return {
    tasks,
    progress,
    status: {
      completed: completedTasks,
      total: totalTasks,
      percentage: progress
    }
  };
};

const getParticipatedIndicators = async (userId) => {
  const mainTasks = await Task.find({
    $or: [
      { leader: userId },
      { supporters: userId }
    ]
  }).select('indicator').lean();
  const subTasks = await Task.find({
    'subTasks.assignee': userId
  }).select('indicator subTasks').lean();
  const indicatorIds = new Set();
  mainTasks.forEach(t => t.indicator && indicatorIds.add(t.indicator.toString()));
  subTasks.forEach(t => {
    if (t.indicator) {
      t.subTasks.forEach(st => {
        if (st.assignee && st.assignee.toString() === userId) {
          indicatorIds.add(t.indicator.toString());
        }
      });
    }
  });
  const indicators = await Indicator.find({ _id: { $in: Array.from(indicatorIds) } }).lean();
  return indicators;
};

module.exports = {
  createIndicator,
  updateIndicator,
  deleteIndicator,
  getIndicators,
  approveNewIndicator,
  getIndicatorTasks,
  getParticipatedIndicators
}; 