const Task = require('../models/task.model');
const Indicator = require('../models/indicator.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

class TaskController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { code, title, endDate, indicatorId, parentTaskId, assigneeId, notes, assignerId, managerIds } = req.body;
      const existingTask = await Task.findOne({ code });
      if (existingTask) {
        return this.#sendResponse(res, 409, false, 'Mã nhiệm vụ đã tồn tại');
      }

      const indicator = await Indicator.findById(indicatorId);
      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      let parentTask = null;
      if (parentTaskId) {
        parentTask = await Task.findById(parentTaskId);
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ cha');
        }
        const assignee = await User.findById(assigneeId);
        if (!assignee) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy người thực hiện');
        }
      }

      if (!assignerId) {
        return this.#sendResponse(res, 400, false, 'Thiếu thông tin người giao nhiệm vụ (assignerId)');
      }
      const assigner = await User.findById(assignerId);
      if (!assigner) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy người giao nhiệm vụ');
      }

      const taskData = { code, title, endDate, indicator: indicatorId, notes };
      if (parentTaskId) {
        parentTask.subTasks.push({ ...taskData, assignee: assigneeId, status: 'pending' });
        await parentTask.save();
        const newSubTask = parentTask.subTasks[parentTask.subTasks.length - 1];
        this.#sendResponse(res, 201, true, 'Tạo nhiệm vụ con thành công', newSubTask);
      } else {
        if (!Array.isArray(managerIds) || managerIds.length === 0) {
          return this.#sendResponse(res, 400, false, 'Thiếu danh sách người phụ trách (managerIds)');
        }
        const managers = await User.find({ _id: { $in: managerIds } });
        if (managers.length !== managerIds.length) {
          return this.#sendResponse(res, 404, false, 'Một hoặc nhiều người phụ trách không tồn tại');
        }
        const task = new Task({ ...taskData, assigner: assignerId, managers: managerIds });
        await task.save();
        this.#sendResponse(res, 201, true, 'Tạo nhiệm vụ thành công', task);
      }
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo nhiệm vụ', null, error.message);
    }
  }

  async updateTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { id } = req.params;
      const { assigneeId, ...updateData } = req.body;
      delete updateData.code;

      const task = await Task.findById(id);
      if (!task) {
        const parentTask = await Task.findOne({ 'subTasks._id': new mongoose.Types.ObjectId(id) });
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
        }
        const subTask = parentTask.subTasks.id(new mongoose.Types.ObjectId(id));
        if (assigneeId) {
          const assignee = await User.findById(assigneeId);
          if (!assignee) {
            return this.#sendResponse(res, 404, false, 'Không tìm thấy người thực hiện');
          }
          subTask.assignee = assigneeId;
        }
        Object.assign(subTask, updateData);
        await parentTask.save();
        this.#sendResponse(res, 200, true, 'Cập nhật nhiệm vụ con thành công', subTask);
      } else {
        Object.assign(task, updateData);
        await task.save();
        this.#sendResponse(res, 200, true, 'Cập nhật nhiệm vụ thành công', task);
      }
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi cập nhật nhiệm vụ', null, error.message);
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id);
      if (!task) {
        const parentTask = await Task.findOne({ 'subTasks._id': id });
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
        }
        parentTask.subTasks.pull(id);
        await parentTask.save();
        this.#sendResponse(res, 200, true, 'Xóa nhiệm vụ con thành công');
      } else {
        await Task.deleteMany({ $or: [{ _id: id }, { parentTask: id }] });
        this.#sendResponse(res, 200, true, 'Xóa nhiệm vụ và các nhiệm vụ con thành công');
      }
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi xóa nhiệm vụ', null, error.message);
    }
  }

  async getSubTasks(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .select('subTasks')
        .populate('subTasks.assignee', 'fullName');
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ con thành công', task.subTasks);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách nhiệm vụ con', null, error.message);
    }
  }

  async getTaskDetail(req, res) {
    try {
      const { id } = req.params;
      const selectUserFields = 'fullName email'; // Fields to select from User model
      const selectIndicatorFields = 'name description'; // Fields to select from Indicator model

      // Try to find it as a main task first
      let task = await Task.findById(id)
        .populate('indicator', selectIndicatorFields)
        .populate('assigner', selectUserFields)
        .populate('managers', selectUserFields)
        .populate('subTasks.assignee', selectUserFields)
        .lean();

      if (task) {
        // If it's a main task, we're good. Just send the response.
        return this.#sendResponse(res, 200, true, 'Lấy chi tiết nhiệm vụ thành công', task);
      }

      // If not found, try to find it as a subtask
      const parentTask = await Task.findOne({ 'subTasks._id': new mongoose.Types.ObjectId(id) })
        .populate('indicator', selectIndicatorFields)
        .populate('assigner', selectUserFields)
        .populate('managers', selectUserFields)
        .populate({
          path: 'subTasks.assignee',
          select: selectUserFields,
          model: 'User' // Explicitly specify the model for population inside the array
        })
        .lean();

      if (parentTask) {
        // Find the specific subtask from the parent's subTasks array
        const subTask = parentTask.subTasks.find(st => st._id.toString() === id);
        
        if (subTask) {
          // To make the response consistent, we'll build a response object
          // that resembles a main task but includes parent info.
          const response = {
            ...subTask,
            // Add parent task info
            parentTask: {
              _id: parentTask._id,
              code: parentTask.code,
              title: parentTask.title
            },
            // Subtasks inherit the indicator from the parent
            indicator: parentTask.indicator,
            // And also managers and assigner
            assigner: parentTask.assigner,
            managers: parentTask.managers
          };
          return this.#sendResponse(res, 200, true, 'Lấy chi tiết nhiệm vụ thành công', response);
        }
      }

      // If neither a task nor a subtask is found
      return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
    } catch (error) {
      // It's good practice to log the error for debugging purposes
      console.error('Get Task Detail Error:', error);
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy chi tiết nhiệm vụ', null, error.message);
    }
  }

  async getPendingTasks(req, res) {
    try {
      const { assignerId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const query = {
        $or: [
          { assigner: assignerId, status: 'submitted' },
          { 'subTasks.status': 'submitted', assigner: assignerId }
        ]
      };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: 'code title endDate status subTasks assigner',
        populate: [
          { path: 'subTasks.assignee', select: 'fullName' },
          { path: 'indicator', select: 'name' }
        ]
      };

      const tasks = await Task.paginate(query, options);

      const result = tasks.docs.flatMap(task => {
        const mainTask = task.status === 'submitted' && task.assigner.toString() === assignerId
          ? [{
              _id: task._id,
              code: task.code,
              title: task.title,
              endDate: task.endDate,
              status: task.status,
              indicator: task.indicator?.name,
              assignee: null,
              parentTask: null,
              submitNote: task.submitNote || null,
              submitLink: task.submitLink || null
            }]
          : [];

        const subTasks = task.subTasks
          .filter(subTask => subTask.status === 'submitted')
          .map(subTask => ({
            _id: subTask._id,
            code: subTask.code,
            title: subTask.title,
            endDate: subTask.endDate,
            status: subTask.status,
            indicator: task.indicator?.name,
            assignee: subTask.assignee ? { _id: subTask.assignee._id, fullName: subTask.assignee.fullName } : null,
            parentTask: task.title,
            submitNote: subTask.submitNote || null,
            submitLink: subTask.submitLink || null
          }));

        return [...mainTask, ...subTasks];
      });

      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ chờ duyệt thành công', {
        ...tasks,
        docs: result
      });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách nhiệm vụ chờ duyệt', null, error.message);
    }
  }

  async submitTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { id } = req.params;
      const { submitNote, submitLink } = req.body;

      let task = await Task.findById(id);
      if (!task) {
        const parentTask = await Task.findOne({ 'subTasks._id': id });
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
        }
        const subTask = parentTask.subTasks.id(id);
        if (subTask.status === 'submitted') {
          return this.#sendResponse(res, 400, false, 'Nhiệm vụ con đã được nộp trước đó');
        }
        if (subTask.status === 'approved') {
          return this.#sendResponse(res, 400, false, 'Nhiệm vụ con đã được duyệt');
        }
        subTask.status = 'submitted';
        subTask.submitNote = submitNote || null;
        subTask.submitLink = submitLink || null;
        await parentTask.save();
        this.#sendResponse(res, 200, true, 'Nộp nhiệm vụ con thành công', subTask);
      } else {
        // Kiểm tra nếu có subTasks thì tất cả phải approved mới cho submit
        if (task.subTasks && task.subTasks.length > 0) {
          const notApproved = task.subTasks.some(st => st.status !== 'approved');
          if (notApproved) {
            return this.#sendResponse(res, 400, false, 'Không thể nộp nhiệm vụ chính khi còn nhiệm vụ con chưa hoàn thành');
          }
        }
        if (task.status === 'submitted') {
          return this.#sendResponse(res, 400, false, 'Nhiệm vụ đã được nộp trước đó');
        }
        if (task.status === 'approved') {
          return this.#sendResponse(res, 400, false, 'Nhiệm vụ đã được duyệt');
        }
        task.status = 'submitted';
        task.submitNote = submitNote || null;
        task.submitLink = submitLink || null;
        await task.save();
        this.#sendResponse(res, 200, true, 'Nộp nhiệm vụ thành công', task);
      }
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi nộp nhiệm vụ', null, error.message);
    }
  }

  async getIncompleteTasks(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const query = {
        $or: [
          { assignee: userId, status: { $in: ['pending', 'submitted'] } },
          { 'subTasks.assignee': userId, 'subTasks.status': { $in: ['pending', 'submitted'] } }
        ]
      };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: 'code title endDate status subTasks submitNote submitLink',
        populate: [
          { path: 'subTasks.assignee', select: 'fullName' },
          { path: 'indicator', select: 'name' }
        ]
      };

      const tasks = await Task.paginate(query, options);

      const result = tasks.docs.flatMap(task =>
        task.subTasks.length > 0
          ? task.subTasks
              .filter(st => st.status !== 'approved' && st.assignee && st.assignee._id?.toString() === userId)
              .map(st => ({
                ...st.toObject(),
                parentTask: task.title,
                indicator: task.indicator.name
              }))
          : task.status !== 'approved' && task.assignee?.toString() === userId
          ? [{ ...task.toObject(), parentTask: null }]
          : []
      );

      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ chưa hoàn thành thành công', {
        ...tasks,
        docs: result
      });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách nhiệm vụ chưa hoàn thành', null, error.message);
    }
  }

  async getCompletedTasks(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const query = {
        $or: [
          { assignee: userId, status: 'approved' },
          { 'subTasks.assignee': userId, 'subTasks.status': 'approved' }
        ]
      };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: 'code title endDate status subTasks submitNote submitLink',
        populate: [
          { path: 'subTasks.assignee', select: 'fullName' },
          { path: 'indicator', select: 'name' }
        ]
      };
      const tasks = await Task.paginate(query, options);
      const result = tasks.docs.flatMap(task =>
        task.subTasks.length > 0
          ? task.subTasks
              .filter(st => st.status === 'approved' && st.assignee && st.assignee._id?.toString() === userId)
              .map(st => ({
                ...st.toObject(),
                parentTask: task.title,
                indicator: task.indicator.name
              }))
          : task.status === 'approved' && task.assignee?.toString() === userId
          ? [{ ...task.toObject(), parentTask: null }]
          : []
      );
      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ đã hoàn thành thành công', {
        ...tasks,
        docs: result
      });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách nhiệm vụ đã hoàn thành', null, error.message);
    }
  }
}

module.exports = new TaskController();