"use strict";
const taskService = require('../services/task.service');
const { validationResult } = require('express-validator');
const { broadcastSSE, sendSseToastToUser } = require('../services/sse.service');

class TaskController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendSseToastToUser(req.user.id, 'error', 'Dữ liệu không hợp lệ');
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }
    try {
      const result = await taskService.createTask(req.body, req.file);
      if (result.type === 'subtask') {
        broadcastSSE('subtask_created', { parentTaskId: result.parentTaskId, subTask: result.subTask });
        sendSseToastToUser(req.user.id, 'success', 'Tạo nhiệm vụ con thành công!');
        return this.#sendResponse(res, 201, true, 'Tạo nhiệm vụ con thành công', result.subTask);
      } else {
        broadcastSSE('task_created', { taskId: result.taskId, task: result.task });
        sendSseToastToUser(req.user.id, 'success', 'Tạo nhiệm vụ thành công!');
        return this.#sendResponse(res, 201, true, 'Tạo nhiệm vụ thành công', result.task);
      }
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi tạo nhiệm vụ');
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi tạo nhiệm vụ');
    }
  }

  async updateTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendSseToastToUser(req.user.id, 'error', 'Dữ liệu không hợp lệ');
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }
    try {
      const result = await taskService.updateTask(req.params.id, req.body);
      if (result.type === 'subtask') {
        broadcastSSE('subtask_updated', { parentTaskId: result.parentTaskId, subTask: result.subTask });
        sendSseToastToUser(req.user.id, 'success', 'Cập nhật nhiệm vụ con thành công!');
        return this.#sendResponse(res, 200, true, 'Cập nhật nhiệm vụ con thành công', result.subTask);
      } else {
        broadcastSSE('task_updated', { taskId: result.taskId, task: result.task });
        sendSseToastToUser(req.user.id, 'success', 'Cập nhật nhiệm vụ thành công!');
        return this.#sendResponse(res, 200, true, 'Cập nhật nhiệm vụ thành công', result.task);
      }
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi cập nhật nhiệm vụ');
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi cập nhật nhiệm vụ');
    }
  }

  async deleteTask(req, res) {
    try {
      const result = await taskService.deleteTask(req.params.id);
      broadcastSSE('task_deleted', { taskId: req.params.id });
      sendSseToastToUser(req.user.id, 'success', 'Xóa nhiệm vụ thành công!');
      if (result.type === 'subtask') {
        return this.#sendResponse(res, 200, true, 'Xóa nhiệm vụ con thành công');
      } else {
        return this.#sendResponse(res, 200, true, 'Xóa nhiệm vụ và các nhiệm vụ con thành công');
      }
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi xóa nhiệm vụ');
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi xóa nhiệm vụ');
    }
  }

  async getSubTasks(req, res) {
    try {
      const subTasks = await taskService.getSubTasks(req.params.id);
      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ con thành công', subTasks);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy danh sách nhiệm vụ con');
    }
  }

  async getTaskDetail(req, res) {
    try {
      const result = await taskService.getTaskDetail(req.params.id);
      if (result.type === 'main') {
        return this.#sendResponse(res, 200, true, 'Lấy chi tiết nhiệm vụ thành công', result.task);
      } else {
        return this.#sendResponse(res, 200, true, 'Lấy chi tiết nhiệm vụ thành công', result.subTask);
      }
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy chi tiết nhiệm vụ');
    }
  }

  async getPendingTasks(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const result = await taskService.getPendingTasks(userId, page, limit);
      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ chờ duyệt thành công', result);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy danh sách nhiệm vụ chờ duyệt');
    }
  }

  async submitTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendSseToastToUser(req.user.id, 'error', 'Dữ liệu không hợp lệ');
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }
    try {
      const result = await taskService.submitTask(req.params, req.file, req.body);
      if (result.type === 'subtask') {
        sendSseToastToUser(req.user.id, 'success', 'Nộp file nhiệm vụ con thành công!');
        return this.#sendResponse(res, 200, true, 'Nộp file nhiệm vụ con thành công', result.submission);
      } else {
        sendSseToastToUser(req.user.id, 'success', 'Nộp file thành công!');
        return this.#sendResponse(res, 200, true, 'Nộp file thành công', { submission: result.submission, indicatorCreator: result.indicatorCreator });
      }
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi nộp file');
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi nộp file');
    }
  }

  async getTaskSubmissions(req, res) {
    try {
      const submissions = await taskService.getTaskSubmissions(req.params.id);
      this.#sendResponse(res, 200, true, 'Lấy log nộp file thành công', submissions);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy log nộp file');
    }
  }

  async getSubTaskSubmissions(req, res) {
    try {
      const submissions = await taskService.getSubTaskSubmissions(req.params.taskId, req.params.subTaskId);
      this.#sendResponse(res, 200, true, 'Lấy log nộp file nhiệm vụ con thành công', submissions);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy log nộp file nhiệm vụ con');
    }
  }

  async getIncompleteTasks(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const result = await taskService.getIncompleteTasks(userId, page, limit);
      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ chưa hoàn thành thành công', result);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy danh sách nhiệm vụ chưa hoàn thành');
    }
  }

  async getCompletedTasks(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const result = await taskService.getCompletedTasks(userId, page, limit);
      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ đã hoàn thành thành công', result);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy danh sách nhiệm vụ đã hoàn thành');
    }
  }

  async createSubTask(req, res) {
    try {
      const parentTaskId = req.params.parentTaskId;
      const result = await taskService.createSubTask(parentTaskId, req.body, req.file, req.user);
      this.#sendResponse(res, 201, true, 'Tạo nhiệm vụ con thành công', result);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi tạo nhiệm vụ con');
    }
  }

  async searchTasks(req, res) {
    try {
      const tasks = await taskService.searchTasks(req.query);
      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: 'Lỗi tìm kiếm nhiệm vụ', error: error.message });
    }
  }

  async getOverdueTasks(req, res) {
    try {
      const result = await taskService.getOverdueTasks(req.query);
      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ quá deadline thành công', result);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy danh sách nhiệm vụ quá deadline');
    }
  }

  async approveTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendSseToastToUser(req.user.id, 'error', 'Dữ liệu không hợp lệ');
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }
    try {
      const result = await taskService.approveTask(req.params, req.body, req.user);
      if (result.subTask) {
        sendSseToastToUser(req.user.id, 'success', 'Chấp thuận nhiệm vụ con thành công!');
        return this.#sendResponse(res, 200, true, 'Chấp thuận nhiệm vụ con thành công', result);
      } else {
        sendSseToastToUser(req.user.id, 'success', 'Chấp thuận nhiệm vụ thành công!');
        return this.#sendResponse(res, 200, true, 'Chấp thuận nhiệm vụ thành công', result);
      }
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi chấp thuận nhiệm vụ');
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi chấp thuận nhiệm vụ');
    }
  }

  async rejectTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendSseToastToUser(req.user.id, 'error', 'Dữ liệu không hợp lệ');
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }
    try {
      const result = await taskService.rejectTask(req.params, req.body, req.user);
      if (result.subTask) {
        sendSseToastToUser(req.user.id, 'success', 'Từ chối nhiệm vụ con thành công!');
        return this.#sendResponse(res, 200, true, 'Từ chối nhiệm vụ con thành công', result);
        } else {
        sendSseToastToUser(req.user.id, 'success', 'Từ chối nhiệm vụ thành công!');
        return this.#sendResponse(res, 200, true, 'Từ chối nhiệm vụ thành công', result);
      }
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi từ chối nhiệm vụ');
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi từ chối nhiệm vụ');
    }
  }

  async getApprovalHistory(req, res) {
    try {
      const result = await taskService.getApprovalHistory(req.params);
      this.#sendResponse(res, 200, true, 'Lấy lịch sử duyệt nhiệm vụ thành công', result);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, error.message || 'Lỗi khi lấy lịch sử duyệt');
    }
  }

  async getAllTasksByHierarchy(req, res) {
    try {
      const result = await taskService.getAllTasksByHierarchy();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: 'Lỗi lấy danh sách chỉ tiêu phân cấp', error: error.message });
    }
  }
}

module.exports = new TaskController();