`use strict`

const Task = require('../models/task.model');
const User = require('../models/user.model');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateCreateTask = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('objective').trim().notEmpty().withMessage('Objective is required'),
  body('assignedUnit').trim().notEmpty().withMessage('Assigned unit is required'),
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  body('assignedTo').isArray().withMessage('assignedTo must be an array').notEmpty().withMessage('assignedTo is required'),
  body('guideline').optional().isString().withMessage('Guideline must be a string')
];

class TaskController {
  async createTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    try {
      const { title, description, objective, assignedUnit, startDate, endDate, quantitativeTarget, priority, field, assignedTo, parentTask, guideline } = req.body;
      const assignedBy = req.user.id;
  
      const creator = await User.findById(assignedBy);
      if (!creator) return res.status(404).json({ success: false, message: 'Creator not found' });
  
      if (creator.role === 'user' && !creator.directSupervisor) {
        return res.status(403).json({ success: false, message: 'Forbidden: Creator must have a valid supervisor to assign tasks' });
      }
  
      if (creator.role === 'user') {
        const assignees = await User.find({ _id: { $in: assignedTo } });
        const isValidAssignment = assignees.every(assignee => assignee.directSupervisor && assignee.directSupervisor.equals(assignedBy));
        if (!isValidAssignment) {
          return res.status(403).json({ success: false, message: 'Forbidden: Can only assign to direct subordinates' });
        }
      }
  
      const isParent = !parentTask;
      const task = new Task({
        title, description, objective, assignedUnit, startDate, endDate, quantitativeTarget, priority, field, assignedBy, assignedTo, parentTask, isParent, guideline
      });
      await task.save();
      res.status(201).json({ success: true, message: 'Task created successfully', taskId: task._id });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getTaskList(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      let tasks;

      if (user.role === 'admin') {
        tasks = await Task.find().populate('assignedBy assignedTo', 'fullName role');
      } else {
        tasks = await Task.find({
          $or: [
            { assignedBy: userId },
            { assignedTo: userId }
          ]
        }).populate('assignedBy assignedTo', 'fullName role');
      }
      res.json(tasks);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getTaskDetail(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id).populate('assignedBy assignedTo', 'fullName role');
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const { progress, actualResult, report } = req.body;
      const userId = req.user.id;

      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      if (!task.assignedTo.includes(userId) && !(task.assignedBy.equals(userId) && req.user.role === 'admin')) {
        return res.status(403).json({ message: 'Forbidden: Only assigned users or admin can update' });
      }

      task.progress = progress || task.progress;
      task.actualResult = actualResult || task.actualResult;
      if (report) {
        task.report = report;
        task.status = 'submitted'; // Gửi báo cáo
      }
      task.updatedAt = Date.now();
      await task.save();
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async approveTask(req, res) {
    try {
      const { id } = req.params;
      const { approved } = req.body; // true hoặc false
      const userId = req.user.id;

      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      const assignee = await User.findById(task.assignedTo[0]);
      if (!assignee.directSupervisor.equals(userId) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only supervisor or admin can approve' });
      }

      if (task.status !== 'submitted') {
        return res.status(400).json({ message: 'Task must be submitted for approval' });
      }

      task.status = approved ? 'approved' : 'rejected';
      task.updatedAt = Date.now();
      await task.save();
      res.json({ message: `Task ${task.status}`, taskId: task._id });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      if (!task.assignedBy.equals(userId) || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only creator or admin can delete' });
      }

      await Task.findByIdAndDelete(id);
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = { TaskController: new TaskController(), validateCreateTask };