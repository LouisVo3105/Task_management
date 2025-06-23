const Task = require('../models/task.model');
const Indicator = require('../models/indicator.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');

class TaskController {
  // Response chuẩn hóa
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  // Tính tiến độ task chính
  #calculateTaskProgress(task) {
    if (task.subTasks.length === 0) return task.progress || 0;
    const validTasks = task.subTasks.filter(st => st.status !== 'rejected');
    if (validTasks.length === 0) return 0;
    const totalProgress = validTasks.reduce((sum, st) => sum + (st.progress || 0), 0);
    return Math.round(totalProgress / validTasks.length);
  }

  // Cập nhật trạng thái task chính dựa trên subTasks
  #updateTaskStatus(task) {
    if (task.subTasks.length === 0) return task.status;
    const allRejected = task.subTasks.every(st => st.status === 'rejected');
    const allApproved = task.subTasks.every(st => st.status === 'approved');
    if (allRejected) return 'rejected';
    if (allApproved && task.status === 'submitted') return 'approved';
    return task.status;
  }

  // Tạo task mới
  async createTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      if (req.user.role === 'user') {
        return this.#sendResponse(res, 403, false, 'Không có quyền tạo nhiệm vụ');
      }

      // const { indicatorId, subTasks = [], ...taskData } = req.body;
      const { indicatorId, assigneeId, subTasks = [], ...taskData } = req.body;
      const assignerId = req.user.id;

      const indicator = await Indicator.findById(indicatorId);
      if (!indicator || indicator.status !== 'active') {
        return this.#sendResponse(res, 404, false, 'Chỉ tiêu không tồn tại hoặc đã bị lưu trữ');
      }

      // const task = new Task({
      //   ...taskData,
      //   indicator: indicatorId,
      //   assigner: assignerId,
      //   subTasks: subTasks.map(st => ({ ...st, status: 'pending' }))
      // });

      const task = new Task({
        ...taskData,
        assignee: assigneeId,
        indicator: indicatorId,
        assigner: assignerId,
        subTasks: subTasks.map(st => ({ ...st, status: 'pending' }))
      });

      await task.save();
      this.#sendResponse(res, 201, true, 'Nhiệm vụ đã được tạo', task);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo nhiệm vụ', null, error.message);
    }
  }

  // Cập nhật task chính
  async updateTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { taskId } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      if (task.assigner.toString() !== userId && req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Không có quyền cập nhật nhiệm vụ');
      }

      Object.assign(task, updateData);
      task.status = this.#updateTaskStatus(task);
      task.progress = this.#calculateTaskProgress(task);
      await task.save();

      this.#sendResponse(res, 200, true, 'Cập nhật nhiệm vụ thành công', task);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi cập nhật nhiệm vụ', null, error.message);
    }
  }

  // Xóa task chính
  async deleteTask(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      if (task.assigner.toString() !== userId && req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Không có quyền xóa nhiệm vụ');
      }

      await task.deleteOne();
      this.#sendResponse(res, 200, true, 'Xóa nhiệm vụ thành công');
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi xóa nhiệm vụ', null, error.message);
    }
  }

  // Thêm subTask
  async addSubTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { taskId } = req.params;
      const { title, assigneeId, startDate, endDate, description } = req.body;
      const userId = req.user.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      if (task.assigner.toString() !== userId && req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Không có quyền thêm subTask');
      }

      const newSubTask = {
        title, assignee: assigneeId, startDate, endDate, description, status: 'pending', progress: 0
      };

      task.subTasks.push(newSubTask);
      task.progress = this.#calculateTaskProgress(task);
      await task.save();

      const createdSubTask = task.subTasks[task.subTasks.length - 1];
      this.#sendResponse(res, 201, true, 'Thêm subTask thành công', createdSubTask);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi thêm subTask', null, error.message);
    }
  }

  // Cập nhật subTask
  async updateSubTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { taskId, subTaskId } = req.params;
      let updateData = req.body;
      const userId = req.user.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      const subTask = task.subTasks.id(subTaskId);
      if (!subTask) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy subTask');
      }

      const isAssignee = subTask.assignee.toString() === userId;
      const isAssigner = task.assigner.toString() === userId;

      if (!isAssignee && !isAssigner && req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Không có quyền cập nhật subTask');
      }

      // Assignee chỉ được cập nhật progress và report
      if (isAssignee && !isAssigner && req.user.role !== 'admin') {
        updateData = {
          progress: updateData.progress,
          report: updateData.report
        };
      }

      Object.assign(subTask, updateData);
      task.progress = this.#calculateTaskProgress(task);
      task.status = this.#updateTaskStatus(task);
      await task.save();

      this.#sendResponse(res, 200, true, 'Cập nhật subTask thành công', subTask);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi cập nhật subTask', null, error.message);
    }
  }

  // Xóa subTask
  async deleteSubTask(req, res) {
    try {
      const { taskId, subTaskId } = req.params;
      const userId = req.user.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      if (task.assigner.toString() !== userId && req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Không có quyền xóa subTask');
      }

      const subTaskIndex = task.subTasks.findIndex(st => st._id.toString() === subTaskId);
      if (subTaskIndex === -1) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy subTask');
      }

      task.subTasks.splice(subTaskIndex, 1);
      task.progress = this.#calculateTaskProgress(task);
      task.status = this.#updateTaskStatus(task);
      await task.save();

      this.#sendResponse(res, 200, true, 'Xóa subTask thành công');
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi xóa subTask', null, error.message);
    }
  }

  // Nộp task chính
  async submitMainTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { taskId } = req.params;
      const { report } = req.body;
      const userId = req.user.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      if (task.assignee.toString() !== userId) {
        return this.#sendResponse(res, 403, false, 'Không có quyền nộp nhiệm vụ');
      }

      if (task.subTasks.length > 0) {
        const allApproved = task.subTasks.every(st => st.status === 'approved');
        if (!allApproved) {
          return this.#sendResponse(res, 400, false, 'Tất cả subTask phải được phê duyệt trước');
        }
      }

      task.report = report;
      task.status = 'submitted';
      await task.save();

      this.#sendResponse(res, 200, true, 'Nộp nhiệm vụ thành công', task);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi nộp nhiệm vụ', null, error.message);
    }
  }

  // Nộp subTask
  async submitSubTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { taskId, subTaskId } = req.params;
      const { report } = req.body;
      const userId = req.user.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      const subTask = task.subTasks.id(subTaskId);
      if (!subTask) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy subTask');
      }

      if (subTask.assignee.toString() !== userId) {
        return this.#sendResponse(res, 403, false, 'Không có quyền nộp subTask');
      }

      subTask.report = report;
      subTask.status = 'submitted';
      await task.save();

      this.#sendResponse(res, 200, true, 'Nộp subTask thành công', subTask);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi nộp subTask', null, error.message);
    }
  }

  // Phê duyệt task hoặc subTask
  async reviewTask(req, res) {
    try {
      const { taskId, subTaskId } = req.params;
      const { approved, feedback } = req.body;
      const userId = req.user.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      let targetTask = task;
      let isSubTask = false;

      if (subTaskId) {
        targetTask = task.subTasks.id(subTaskId);
        isSubTask = true;
        if (!targetTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy subTask');
        }
      }

      const isAssigner = task.assigner.toString() === userId;
      if (!isAssigner && req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Không có quyền phê duyệt');
      }

      if (targetTask.status !== 'submitted') {
        return this.#sendResponse(res, 400, false, 'Nhiệm vụ chưa được nộp');
      }

      if (approved) {
        targetTask.status = 'approved';
        targetTask.progress = 100;
        targetTask.feedback = feedback;
      } else {
        targetTask.status = 'rejected';
        targetTask.feedback = feedback;
        targetTask.progress = 0;
      }

      if (isSubTask) {
        task.progress = this.#calculateTaskProgress(task);
        task.status = this.#updateTaskStatus(task);
      }

      await task.save();
      this.#sendResponse(res, 200, true, `Nhiệm vụ ${approved ? 'được phê duyệt' : 'bị từ chối'}`, targetTask);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi phê duyệt nhiệm vụ', null, error.message);
    }
  }

  // Lấy danh sách tasks
  async getTasks(req, res) {
    try {
      const { page = 1, limit = 10, status, assigneeId, indicatorId, priority, search } = req.query;
      const query = {};

      if (status) query.status = status;
      if (assigneeId) query.assigneeId = assigneeId;
      
      if (indicatorId) query.indicatorId = indicatorId;
      
      if (priority) query.priority = priority;
      if (search) {
        query.$or = { 
          title: { $regex: search, $options: 'i' } ,
          description: { $regex: search, $options: 'i' } 
        }; 
      }

      
      const options = { 
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }, 
        select: 'title description status assigneeId indicatorId priority createdAt', 
        populate: [
          { path: 'assignee', select: 'fullName'},
          { path: 'indicator', select: 'name' }
        ]
      }; 

      
      const tasks = await Task.paginate(query, options);
      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ thành công', tasks);
    } catch (error) {
      this.#sendResponse(res, 500, false, res, 'Lỗi khi lấy danh sách nhiệm vụ', null, error.message);
    }
  }

  // Lấy danh sách nhiệm vụ chờ phê duyệt
  async getPendingTasks(req, res) {
    try {
      const userId = req.user.id;
      let query = { status: 'completed' }; 

      if (req.user.role === 'user') {
        query.assignee = userId;
      } else if (req.user.role === 'manager') {
        const usersInDepartment = await User.find({ department: req.user.department }, '_id');
        const userIds = usersInDepartment.map(u => u._id);
        query.$or = [
          { assigner: { $in: userIds } },
          { assignee: { $in: userIds } }
        ];
      }

      const tasks = await Task.find(query)
        .populate('indicatorId', 'fullName name')
        .populate('assigner', 'fullName')
        .populate('assignee', 'fullName department')
        .select('-__v');

      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ chờ duyệt thành công', tasks);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách nhiệm vụ chờ duyệt', null, error.message);
    }
  }

  // Lấy chi tiết nhiệm vụ
  async getTaskDetail(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .populate('indicator', 'fullName name description')
        .populate('assigner', 'fullName position')
        .populate('assignee', 'fullName position department')
        .populate('subTasks.assignee', 'fullName department')
        .select('-__v');

      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      this.#sendResponse(res, 200, true, 'Lấy chi tiết nhiệm vụ thành công', task);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy chi tiết nhiệm vụ', null, error.message);
    }
  }
}

module.exports = new TaskController();