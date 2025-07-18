"use strict";
const Task = require('../models/task.model');

// Middleware để tự động cập nhật trạng thái quá deadline
const updateOverdueStatus = async (req, res, next) => {
  try {
    const now = new Date();
    
    // Cập nhật nhiệm vụ chính quá deadline
    await Task.updateMany(
      {
        status: { $in: ['pending'] },
        endDate: { $lt: now }
      },
      {
        $set: { status: 'overdue' }
      }
    );

    // Cập nhật nhiệm vụ con quá deadline
    await Task.updateMany(
      {
        'subTasks.status': { $in: ['pending'] },
        'subTasks.endDate': { $lt: now }
      },
      {
        $set: { 'subTasks.$.status': 'overdue' }
      }
    );

    next();
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái quá deadline:', error);
    next(); // Vẫn tiếp tục xử lý request ngay cả khi có lỗi
  }
};

// Middleware để kiểm tra và cập nhật trạng thái quá deadline cho một task cụ thể
const updateSingleTaskOverdueStatus = async (taskId) => {
  try {
    const now = new Date();
    const task = await Task.findById(taskId);
    
    if (!task) return;

    let hasChanges = false;

    // Kiểm tra nhiệm vụ chính
    if (['pending', 'submitted'].includes(task.status) && task.endDate < now) {
      task.status = 'overdue';
      hasChanges = true;
    }

    // Kiểm tra nhiệm vụ con
    if (task.subTasks && task.subTasks.length > 0) {
      task.subTasks.forEach(subTask => {
        if (['pending', 'submitted'].includes(subTask.status) && subTask.endDate < now) {
          subTask.status = 'overdue';
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      await task.save();
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái quá deadline cho task:', error);
  }
};

module.exports = {
  updateOverdueStatus,
  updateSingleTaskOverdueStatus
}; 