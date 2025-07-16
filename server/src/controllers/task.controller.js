const Task = require('../models/task.model');
const Indicator = require('../models/indicator.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { roleMiddleware } = require('../middlewares/auth.middleware');
const path = require('path');
const fs = require('fs');
const { broadcastSSE } = require('../services/sse.service');


class TaskController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createTask(req, res) {
    console.log(req.file)
    let supporterIds = (req.body && req.body.supporterIds) || [];
    if (!Array.isArray(supporterIds)) {
      supporterIds = supporterIds ? [supporterIds] : [];
    }
    req.body.supporterIds = supporterIds;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const fileObj = req.file;
      let fileName = fileObj ? fileObj.originalname : undefined;
      if (fileName) {
        fileName = Buffer.from(fileName, 'latin1').toString('utf8');
      }
      const { title,content, endDate, indicatorId, parentTaskId, assigneeId, notes, leaderId, supporterIds, departmentId } = req.body;

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
        
        // Kiểm tra trạng thái của nhiệm vụ cha
        if (parentTask.status === 'submitted' || parentTask.status === 'approved') {
          return this.#sendResponse(res, 400, false, 'Không thể tạo nhiệm vụ con cho nhiệm vụ đã submit hoặc đã duyệt');
        }
        
        const assignee = await User.findById(assigneeId);
        if (!assignee) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy người thực hiện');
        }
      }

      if (!leaderId) {
        return this.#sendResponse(res, 400, false, 'Thiếu thông tin người chủ trì (leaderId)');
      }
      const leader = await User.findById(leaderId);
      if (!leader) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy người chủ trì');
      }

      // Lưu file hướng dẫn vào trường file, fileName
      const taskData = {
        title,
        content,
        endDate,
        indicator: indicatorId,
        notes,
        department: departmentId,
        file: fileObj ? fileObj.path : undefined,
        fileName: fileName
      };
      if (!parentTaskId && taskData.subTasks) {
        delete taskData.subTasks;
      }
      if (parentTaskId) {
        parentTask.subTasks.push({ ...taskData, assignee: assigneeId, status: 'pending' });
        await parentTask.save();
        const newSubTask = parentTask.subTasks[parentTask.subTasks.length - 1];
        broadcastSSE('subtask_created', { parentTaskId: parentTask._id, subTask: newSubTask });
        this.#sendResponse(res, 201, true, 'Tạo nhiệm vụ con thành công', newSubTask);
      } else {
        if (!Array.isArray(supporterIds) || supporterIds.length === 0) {
          return this.#sendResponse(res, 400, false, 'Thiếu danh sách người hỗ trợ (supporterIds)');
        }
        const supporters = await User.find({ _id: { $in: supporterIds } });
        if (supporters.length !== supporterIds.length) {
          return this.#sendResponse(res, 404, false, 'Một hoặc nhiều người hỗ trợ không tồn tại');
        }
        // Đảm bảo không truyền subTasks rỗng hoặc không hợp lệ khi tạo nhiệm vụ chính
        if (taskData.subTasks && Array.isArray(taskData.subTasks)) {
          taskData.subTasks = taskData.subTasks.filter(st => st && st.title);
          if (taskData.subTasks.length === 0) delete taskData.subTasks;
          else {
            // Nếu có subTasks, sinh code cho từng subtask
            taskData.subTasks = taskData.subTasks.map(st => ({
              ...st,
              code: `${Date.now()}_${Math.floor(Math.random()*100000)}`
            }));
          }
        }
        // Đảm bảo mỗi task có code duy nhất
        const uniqueCode = `${Date.now()}_${Math.floor(Math.random()*1000000)}`;
        const task = new Task({ ...taskData, leader: leaderId, supporters: supporterIds, indicatorCreator: indicator.creator, code: uniqueCode });
        await task.save();
        broadcastSSE('task_created', { taskId: task._id, task });
        this.#sendResponse(res, 201, true, 'Tạo nhiệm vụ thành công', task);
      }
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo nhiệm vụ', null, error.message);
    }
  }

  async updateTask(req, res) {
    console.log(req.body)
    const errors = validationResult(req);
    console.log(errors)
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { id } = req.params;
      const { assigneeId, ...updateData } = req.body;

      const task = await Task.findById(id);
      if (!task) {
        const parentTask = await Task.findOne({ 'subTasks._id': new mongoose.Types.ObjectId(id) });
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
        }
        // Chỉ chặn khi nhiệm vụ cha đã approved
        if (parentTask.status === 'approved') {
          return this.#sendResponse(res, 400, false, 'Không thể cập nhật nhiệm vụ con của nhiệm vụ đã duyệt');
        }
        const subTask = parentTask.subTasks.id(new mongoose.Types.ObjectId(id));
        // Chỉ chặn khi subtask đã approved
        if (subTask.status === 'approved') {
          return this.#sendResponse(res, 400, false, 'Không thể cập nhật nhiệm vụ con đã duyệt');
        }
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
        broadcastSSE('subtask_updated', { parentTaskId: parentTask._id, subTask: subTask });
      } else {
        // Chỉ chặn khi nhiệm vụ chính đã approved
        if (task.status === 'approved') {
          return this.#sendResponse(res, 400, false, 'Không thể cập nhật nhiệm vụ đã duyệt');
        }
        
        // Xử lý supporterIds riêng biệt
        if (updateData.supporterIds) {
          // Kiểm tra xem tất cả supporterIds có tồn tại không
          const supporters = await User.find({ _id: { $in: updateData.supporterIds } });
          if (supporters.length !== updateData.supporterIds.length) {
            return this.#sendResponse(res, 404, false, 'Một hoặc nhiều người hỗ trợ không tồn tại');
          }
          task.supporters = updateData.supporterIds;
          delete updateData.supporterIds; // Xóa khỏi updateData để tránh ghi đè
        }
        
        Object.assign(task, updateData);
        await task.save();
        this.#sendResponse(res, 200, true, 'Cập nhật nhiệm vụ thành công', task);
        broadcastSSE('task_updated', { taskId: task._id, task });
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
        
        // Kiểm tra trạng thái của nhiệm vụ cha
        if (parentTask.status === 'submitted' || parentTask.status === 'approved') {
          return this.#sendResponse(res, 400, false, 'Không thể xóa nhiệm vụ con của nhiệm vụ đã submit hoặc đã duyệt');
        }
        
        // Xóa file của subtask
        const subTask = parentTask.subTasks.id(id);
        if (subTask && subTask.file) {
          try {
            fs.unlinkSync(subTask.file);
          } catch (err) {
            console.log('File không tồn tại hoặc đã bị xóa:', subTask.file);
          }
        }
        
        // Xóa files của submissions
        if (subTask && subTask.submissions) {
          subTask.submissions.forEach(submission => {
            if (submission.file) {
              try {
                fs.unlinkSync(submission.file);
              } catch (err) {
                console.log('Submission file không tồn tại:', submission.file);
              }
            }
          });
        }
        
        parentTask.subTasks.pull(id);
        await parentTask.save();
        this.#sendResponse(res, 200, true, 'Xóa nhiệm vụ con thành công');
        broadcastSSE('task_deleted', { taskId: id });
      } else {
        // Kiểm tra trạng thái của nhiệm vụ chính
        if (task.status === 'submitted' || task.status === 'approved') {
          return this.#sendResponse(res, 400, false, 'Không thể xóa nhiệm vụ đã submit hoặc đã duyệt');
        }
        
        // Xóa file của task chính
        if (task.file) {
          try {
            fs.unlinkSync(task.file);
          } catch (err) {
            console.log('File không tồn tại hoặc đã bị xóa:', task.file);
          }
        }
        
        // Xóa files của submissions của task chính
        if (task.submissions) {
          task.submissions.forEach(submission => {
            if (submission.file) {
              try {
                fs.unlinkSync(submission.file);
              } catch (err) {
                console.log('Submission file không tồn tại:', submission.file);
              }
            }
          });
        }
        
        // Xóa files của tất cả subtasks
        if (task.subTasks) {
          task.subTasks.forEach(subTask => {
            if (subTask.file) {
              try {
                fs.unlinkSync(subTask.file);
              } catch (err) {
                console.log('Subtask file không tồn tại:', subTask.file);
              }
            }
            // Xóa files của submissions của subtask
            if (subTask.submissions) {
              subTask.submissions.forEach(submission => {
                if (submission.file) {
                  try {
                    fs.unlinkSync(submission.file);
                  } catch (err) {
                    console.log('Subtask submission file không tồn tại:', submission.file);
                  }
                }
              });
            }
          });
        }
        
        await Task.deleteMany({ $or: [{ _id: id }, { parentTask: id }] });
        this.#sendResponse(res, 200, true, 'Xóa nhiệm vụ và các nhiệm vụ con thành công');
        broadcastSSE('task_deleted', { taskId: id });
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
        .populate('leader', selectUserFields)
        .populate({
          path: 'supporters',
          select: selectUserFields + ' department',
          populate: { path: 'department', select: '_id name' }
        })
        .populate('subTasks.assignee', selectUserFields)
        .populate('department', '_id name')
        .populate('approvalHistory.reviewer', 'fullName')
        .lean();

      if (task) {
        return this.#sendResponse(res, 200, true, 'Lấy chi tiết nhiệm vụ thành công', task);
      }

      //Nếu không tìm thấy task sẽ thử tìm subtask
      const parentTask = await Task.findOne({ 'subTasks._id': new mongoose.Types.ObjectId(id) })
        .populate('indicator', selectIndicatorFields)
        .populate('leader', selectUserFields)
        .populate('supporters', selectUserFields)
        .populate('department', '_id name')
        .populate({
          path: 'subTasks.assignee',
          select: selectUserFields,
          model: 'User' 
        })
        .lean();

      if (parentTask) {
        // Find the specific subtask from the parent's subTasks array
        const subTask = parentTask.subTasks.find(st => st._id.toString() === id);
        
        if (subTask) {
          // Populate reviewer cho subtask approval history
          const populatedHistory = subTask.approvalHistory ? 
            await Promise.all(subTask.approvalHistory.map(async (history) => {
              const reviewer = await User.findById(history.reviewer).select('fullName');
              return {
                ...history,
                reviewer: reviewer ? { _id: reviewer._id, fullName: reviewer.fullName } : null
              };
            })) : [];

          // To make the response consistent, we'll build a response object
          // that resembles a main task but includes parent info.
          const response = {
            ...subTask,
            file: subTask.file || null,
            fileName: subTask.fileName || null,
            approvalHistory: populatedHistory,

            // Add Department info
            department: {
              _id: parentTask.department._id,
              name: parentTask.department.name
            },
            // Add parent task info
            parentTask: {
              _id: parentTask._id,
              title: parentTask.title
            },
            // Subtasks inherit the indicator from the parent
            indicator: parentTask.indicator,
            // And also leaders and supporters
            leader: parentTask.leader,
            supporters: parentTask.supporters
          };
          return this.#sendResponse(res, 200, true, 'Lấy chi tiết nhiệm vụ thành công', response);
        }
      }

      // If neither a task nor a subtask is found
      return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy chi tiết nhiệm vụ', null, error.message);
    }
  }

  async getPendingTasks(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const query = {
        $or: [
          { indicatorCreator: userId, status: 'submitted' }, // Nhiệm vụ chính chờ duyệt cho creator
          { 'subTasks.status': 'submitted', leader: userId } // Nhiệm vụ con chờ duyệt cho leader
        ]
      };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: 'title content endDate status subTasks leader indicatorCreator',
        populate: [
          { path: 'subTasks.assignee', select: 'fullName' },
          { path: 'indicator', select: 'name' }
        ]
      };

      const tasks = await Task.paginate(query, options);

      // Tách nhiệm vụ chính và nhiệm vụ con chờ duyệt
      const result = tasks.docs.flatMap(task => {
        // Nhiệm vụ chính chờ duyệt (chỉ creator thấy)
        const mainTask = (task.status === 'submitted' && task.indicatorCreator?.toString() === userId)
          ? [{
              _id: task._id,
              title: task.title,
              content: task.content,
              endDate: task.endDate,
              status: task.status,
              indicator: task.indicator?.name,
              assignee: null,
              parentTask: null,
              submitNote: task.submitNote || null,
              submitLink: task.submitLink || null,
              type: 'main',
            }]
          : [];
        // Nhiệm vụ con chờ duyệt (chỉ leader thấy)
        const subTasks = task.subTasks
          .filter(subTask => subTask.status === 'submitted')
          .map(subTask => ({
            _id: subTask._id,
            title: subTask.title,
            content: subTask.content,
            endDate: subTask.endDate,
            status: subTask.status,
            indicator: task.indicator?.name,
            assignee: subTask.assignee ? { _id: subTask.assignee._id, fullName: subTask.assignee.fullName } : null,
            parentTask: task.title,
            submitNote: subTask.submitNote || null,
            submitLink: subTask.submitLink || null,
            type: 'sub',
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
      // Nếu có subTaskId thì nộp file cho subtask
      const { id, taskId, subTaskId } = req.params;
      const file = req.file; // Lấy file thực từ multer
      const link = req.body.link || req.body.submitLink;
      const note = req.body.note || req.body.submitNote;
      
      // Xử lý file từ multer hoặc từ req.body (base64)
      let fileData = null;
      if (file) {
        // File upload thực tế từ multer
        let uploadFileName = file.originalname;
        if (uploadFileName) {
          uploadFileName = Buffer.from(uploadFileName, 'latin1').toString('utf8');
        }
        fileData = {
          path: file.path,
          fileName: uploadFileName,

        };
      } else if (req.body.file) {
        // File base64 từ frontend
        try {
          const fileInfo = JSON.parse(req.body.file);
          if (fileInfo.dataURL) {
            // Tạo file từ base64
            const base64Data = fileInfo.dataURL.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = fileInfo.originalName || 'uploaded_file';
            const ext = path.extname(fileName);
            const nameWithoutExt = path.basename(fileName, ext);
            const timestamp = Date.now();
            const savedFileName = `${nameWithoutExt}_${timestamp}${ext}`;
            const filePath = `uploads/${savedFileName}`;
            
            // Lưu file vào thư mục uploads
            const fs = require('fs');
            const path = require('path');
            const uploadDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            fs.writeFileSync(path.join(uploadDir, path.basename(filePath)), buffer);
            
            fileData = {
              path: filePath,
              fileName: fileName,

            };
          }
        } catch (error) {
          return this.#sendResponse(res, 400, false, 'File không hợp lệ');
        }
      }
      
      if (!fileData) {
        return this.#sendResponse(res, 400, false, 'File upload là bắt buộc');
      }
      // Nộp cho subtask
      if (taskId && subTaskId) {
        const parentTask = await Task.findById(taskId);
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ cha');
        }
        const subTask = parentTask.subTasks.id(subTaskId);
        if (!subTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ con');
        }
        subTask.submissions = subTask.submissions || [];
        subTask.submissions.push({ 
          file: fileData.path, 
          fileName: fileData.fileName, 
          link, 
          note 
        });
        if (subTask.status !== 'approved') {
          subTask.status = 'submitted';
        }
        await parentTask.save();
        return this.#sendResponse(res, 200, true, 'Nộp file nhiệm vụ con thành công', subTask.submissions[subTask.submissions.length - 1]);
      }
      // Nộp cho task chính (giữ nguyên logic cũ)
      const mainTaskId = id || taskId;
      let task = await Task.findById(mainTaskId);
      if (task) {
        // Kiểm tra trạng thái các subtask trước khi cho phép nộp nhiệm vụ chính
        if (task.subTasks && task.subTasks.length > 0) {
          const hasUnsubmittedSubtask = task.subTasks.some(st => st.status !== 'submitted' && st.status !== 'approved');
          if (hasUnsubmittedSubtask) {
            return this.#sendResponse(res, 400, false, 'Không thể nộp nhiệm vụ chính khi còn nhiệm vụ con chưa nộp hoặc chưa hoàn thành');
          }
        }
        task.submissions.push({ 
          file: fileData.path, 
          fileName: fileData.fileName, 
          link, 
          note 
        });
        if (task.status !== 'approved') {
          task.status = 'submitted';
        }
        await task.save();
        const indicatorCreator = task.indicatorCreator;
        return this.#sendResponse(res, 200, true, 'Nộp file thành công', { submission: task.submissions[task.submissions.length - 1], indicatorCreator });
      } else {
        // Trường hợp cũ tìm subtask theo id (giữ lại để tương thích)
        const parentTask = await Task.findOne({ 'subTasks._id': mainTaskId });
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
        }
        const subTask = parentTask.subTasks.id(mainTaskId);
        if (!subTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ con');
        }
        subTask.submissions = subTask.submissions || [];
        subTask.submissions.push({ 
          file: fileData.path, 
          fileName: fileData.fileName, 
          link, 
          note 
        });
        if (subTask.status !== 'approved') {
          subTask.status = 'submitted';
        }
        await parentTask.save();
        return this.#sendResponse(res, 200, true, 'Nộp file nhiệm vụ con thành công', subTask.submissions[subTask.submissions.length - 1]);
      }
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi nộp file', null, error.message);
    }
  }

  // API lấy log các lần nộp file nhiệm vụ chính
  async getTaskSubmissions(req, res) {
    try {
      const { id } = req.params;
      const task = await Task.findById(id)
        .select('submissions')
        .populate('submissions.reviewer', 'fullName');
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      // Populate reviewer cho mỗi submission
      const populatedSubmissions = await Promise.all(task.submissions.map(async (submission) => {
        const submissionObj = submission.toObject();
        if (submission.reviewer) {
          const reviewer = await User.findById(submission.reviewer).select('fullName');
          submissionObj.reviewer = reviewer ? { _id: reviewer._id, fullName: reviewer.fullName } : null;
        }
        return submissionObj;
      }));

      this.#sendResponse(res, 200, true, 'Lấy log nộp file thành công', populatedSubmissions);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy log nộp file', null, error.message);
    }
  }

  // API lấy log các lần nộp file nhiệm vụ con
  async getSubTaskSubmissions(req, res) {
    try {
      const { taskId, subTaskId } = req.params;
      const task = await Task.findById(taskId).select('subTasks');
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ cha');
      }
      const subTask = task.subTasks.id(subTaskId);
      if (!subTask) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ con');
      }

      // Populate reviewer cho mỗi submission của subtask
      const populatedSubmissions = await Promise.all((subTask.submissions || []).map(async (submission) => {
        const submissionObj = submission.toObject();
        if (submission.reviewer) {
          const reviewer = await User.findById(submission.reviewer).select('fullName');
          submissionObj.reviewer = reviewer ? { _id: reviewer._id, fullName: reviewer.fullName } : null;
        }
        return submissionObj;
      }));

      this.#sendResponse(res, 200, true, 'Lấy log nộp file nhiệm vụ con thành công', populatedSubmissions);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy log nộp file nhiệm vụ con', null, error.message);
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
        select: 'title content endDate status subTasks submitNote submitLink',
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
                indicator: task.indicator.name,
                createdAt: st.createdAt || task.createdAt // Ưu tiên createdAt của subtask, nếu không có thì lấy của task
              }))
          : task.status !== 'approved' && task.assignee?.toString() === userId
          ? [{ ...task.toObject(), parentTask: null, createdAt: task.createdAt }]
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
        select: 'title content endDate status subTasks submitNote submitLink',
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

  async createSubTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }
    try {
      const { parentTaskId } = req.params;
      const { title, content, endDate, assigneeId, notes } = req.body;
      const file = req.file; // Lấy file thực từ multer
      
      const parentTask = await Task.findById(parentTaskId);
      if (!parentTask) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ cha');
      }
      
      // Kiểm tra trạng thái của nhiệm vụ cha
      if (parentTask.status === 'submitted' || parentTask.status === 'approved') {
        return this.#sendResponse(res, 400, false, 'Không thể tạo nhiệm vụ con cho nhiệm vụ đã submit hoặc đã duyệt');
      }
      
      const user = req.user;
      if (
        !user ||
        !user.id ||
        (user.role !== 'admin' &&
          user.role !== 'director' &&
          (!parentTask.leader || parentTask.leader.toString() !== user.id))
      ) {
        return this.#sendResponse(res, 403, false, 'Bạn không có quyền tạo nhiệm vụ con cho nhiệm vụ này');
      }
      const assignee = await User.findById(assigneeId);
      if (!assignee) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy người thực hiện');
      }
      // Lấy thông tin từ nhiệm vụ cha
      const department = parentTask.department;
      const leader = parentTask.leader;
      const supporters = parentTask.supporters;
      // Tạo subtask mới
      let subTaskFileName = file ? file.originalname : null;
      if (subTaskFileName) {
        subTaskFileName = Buffer.from(subTaskFileName, 'latin1').toString('utf8');
      }
      const subTaskData = {
        title,
        content,
        endDate,
        assignee: assigneeId,
        notes,
        file: file ? file.path : null,
        fileName: subTaskFileName,
        mimeType: file ? file.mimetype : null,
        status: 'pending',
        department,
        leader,
        supporters
      };
      parentTask.subTasks.push(subTaskData);
      await parentTask.save();
      const newSubTask = parentTask.subTasks[parentTask.subTasks.length - 1];
      this.#sendResponse(res, 201, true, 'Tạo nhiệm vụ con thành công', newSubTask);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo nhiệm vụ con', null, error.message);
    }
  }

  async searchTasks(req, res) {
    try {
      const { title, department, leader, indicator, endDateFrom, endDateTo } = req.query;
      const filter = {};
      if (title) {
        filter.title = { $regex: title, $options: 'i' };
      }
      if (department) {
        filter.department = department;
      }
      if (leader) {
        filter.leader = leader;
      }
      if (indicator) {
        filter.indicator = indicator;
      }
      if (endDateFrom || endDateTo) {
        filter.endDate = {};
        if (endDateFrom) filter.endDate.$gte = new Date(endDateFrom);
        if (endDateTo) filter.endDate.$lte = new Date(endDateTo);
      }
      const tasks = await Task.find(filter)
        .populate('department leader indicator')
        .select('title department leader indicator endDate status');
      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi tìm kiếm nhiệm vụ', error: error.message });
    }
  }

  // API lấy danh sách nhiệm vụ quá deadline
  async getOverdueTasks(req, res) {
    try {
      const { page = 1, limit = 10, userId } = req.query;
      const now = new Date();
      
      // Query để lấy nhiệm vụ quá deadline
      const query = {
        $or: [
          // Nhiệm vụ chính quá deadline
          {
            status: { $in: ['pending', 'submitted', 'overdue'] },
            endDate: { $lt: now }
          },
          // Nhiệm vụ con quá deadline
          {
            'subTasks.status': { $in: ['pending', 'submitted', 'overdue'] },
            'subTasks.endDate': { $lt: now }
          }
        ]
      };

      // Nếu có userId, chỉ lấy nhiệm vụ của user đó
      if (userId) {
        query.$and = [
          {
            $or: [
              { assignee: userId },
              { 'subTasks.assignee': userId }
            ]
          }
        ];
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { endDate: 1 }, // Sắp xếp theo deadline gần nhất trước
        select: 'title content endDate status subTasks leader department indicator',
        populate: [
          { path: 'subTasks.assignee', select: 'fullName' },
          { path: 'leader', select: 'fullName' },
          { path: 'department', select: 'name' },
          { path: 'indicator', select: 'name' }
        ]
      };

      const tasks = await Task.paginate(query, options);

      // Xử lý kết quả để tách nhiệm vụ chính và nhiệm vụ con quá deadline
      const result = tasks.docs.flatMap(task => {
        const overdueItems = [];

        // Nhiệm vụ chính quá deadline
        if (['pending', 'submitted', 'overdue'].includes(task.status) && task.endDate < now) {
          overdueItems.push({
            _id: task._id,
            title: task.title,
            content: task.content,
            endDate: task.endDate,
            status: task.status,
            type: 'main',
            parentTask: null,
            indicator: task.indicator?.name,
            leader: task.leader?.fullName,
            department: task.department?.name,
            daysOverdue: Math.ceil((now - task.endDate) / (1000 * 60 * 60 * 24))
          });
        }

        // Nhiệm vụ con quá deadline
        if (task.subTasks && task.subTasks.length > 0) {
          task.subTasks.forEach(subTask => {
            if (['pending', 'submitted', 'overdue'].includes(subTask.status) && subTask.endDate < now) {
              overdueItems.push({
                _id: subTask._id,
                title: subTask.title,
                content: subTask.content,
                endDate: subTask.endDate,
                status: subTask.status,
                type: 'sub',
                parentTask: task.title,
                indicator: task.indicator?.name,
                leader: task.leader?.fullName,
                department: task.department?.name,
                assignee: subTask.assignee?.fullName,
                daysOverdue: Math.ceil((now - subTask.endDate) / (1000 * 60 * 60 * 24))
              });
            }
          });
        }

        return overdueItems;
      });

      // Sắp xếp theo số ngày quá deadline (nhiều nhất trước)
      result.sort((a, b) => b.daysOverdue - a.daysOverdue);

      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ quá deadline thành công', {
        ...tasks,
        docs: result
      });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách nhiệm vụ quá deadline', null, error.message);
    }
  }

  // API chấp thuận báo cáo
  async approveTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { id, taskId, subTaskId, submissionId } = req.params;
      const { comment } = req.body;
      const reviewer = req.user;

      if (!comment || comment.trim() === '') {
        return this.#sendResponse(res, 400, false, 'Nhận xét là bắt buộc');
      }

      // Xử lý chấp thuận subtask
      if (taskId && subTaskId) {
        const parentTask = await Task.findById(taskId);
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ cha');
        }

        const subTask = parentTask.subTasks.id(subTaskId);
        if (!subTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ con');
        }

        // Kiểm tra quyền duyệt
        if (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.position !== 'Giam doc' && parentTask.leader.toString() !== reviewer.id) {
          return this.#sendResponse(res, 403, false, 'Bạn không có quyền duyệt nhiệm vụ này');
        }

              // Tìm submission cụ thể nếu có submissionId
      let targetSubmission = null;
      if (submissionId) {
        console.log('Looking for submissionId in subtask:', submissionId);
        console.log('Available subtask submissions:', subTask.submissions.map(s => ({ id: s._id, fileName: s.fileName })));
        
        targetSubmission = subTask.submissions.id(submissionId);
        if (!targetSubmission) {
          return this.#sendResponse(res, 404, false, `Không tìm thấy submission với ID: ${submissionId} trong subtask. Tổng số submissions: ${subTask.submissions.length}`);
        }
        // Cập nhật submission cụ thể
        targetSubmission.approvalStatus = 'approved';
        targetSubmission.approvalComment = comment.trim();
        targetSubmission.reviewer = reviewer.id;
        targetSubmission.reviewedAt = new Date();
      } else {
          // Duyệt submission mới nhất
          if (subTask.submissions.length === 0) {
            return this.#sendResponse(res, 400, false, 'Không có submission nào để duyệt');
          }
          targetSubmission = subTask.submissions[subTask.submissions.length - 1];
          targetSubmission.approvalStatus = 'approved';
          targetSubmission.approvalComment = comment.trim();
          targetSubmission.reviewer = reviewer.id;
          targetSubmission.reviewedAt = new Date();
        }

        // Thêm vào lịch sử duyệt
        subTask.approvalHistory = subTask.approvalHistory || [];
        subTask.approvalHistory.push({
          action: 'approve',
          comment: comment.trim(),
          reviewer: reviewer.id,
          reviewedAt: new Date()
        });

        // Cập nhật trạng thái task
        subTask.status = 'approved';
        await parentTask.save();

        return this.#sendResponse(res, 200, true, 'Chấp thuận nhiệm vụ con thành công', {
          subTask,
          approvedSubmission: targetSubmission,
          approvalHistory: subTask.approvalHistory[subTask.approvalHistory.length - 1]
        });
      }

      // Xử lý chấp thuận task chính
      const mainTaskId = id || taskId;
      const task = await Task.findById(mainTaskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      // Kiểm tra trạng thái các subtask trước khi cho phép duyệt nhiệm vụ chính
      if (task.subTasks && task.subTasks.length > 0) {
        const hasUnsubmittedSubtask = task.subTasks.some(st => st.status !== 'submitted' && st.status !== 'approved');
        if (hasUnsubmittedSubtask) {
          return this.#sendResponse(res, 400, false, 'Không thể duyệt nhiệm vụ chính khi còn nhiệm vụ con chưa nộp hoặc chưa hoàn thành');
        }
      }

      // Kiểm tra quyền duyệt
      if (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.position !== 'Giam doc' && task.leader.toString() !== reviewer.id) {
        return this.#sendResponse(res, 403, false, 'Bạn không có quyền duyệt nhiệm vụ này');
      }

      // Tìm submission cụ thể nếu có submissionId
      let targetSubmission = null;
      if (submissionId) {
        console.log('Looking for submissionId:', submissionId);
        console.log('Available submissions:', task.submissions.map(s => ({ id: s._id, fileName: s.fileName })));
        
        targetSubmission = task.submissions.id(submissionId);
        if (!targetSubmission) {
          return this.#sendResponse(res, 404, false, `Không tìm thấy submission với ID: ${submissionId}. Tổng số submissions: ${task.submissions.length}`);
        }
        // Cập nhật submission cụ thể
        targetSubmission.approvalStatus = 'approved';
        targetSubmission.approvalComment = comment.trim();
        targetSubmission.reviewer = reviewer.id;
        targetSubmission.reviewedAt = new Date();
      } else {
        // Duyệt submission mới nhất
        if (task.submissions.length === 0) {
          return this.#sendResponse(res, 400, false, 'Không có submission nào để duyệt');
        }
        targetSubmission = task.submissions[task.submissions.length - 1];
        targetSubmission.approvalStatus = 'approved';
        targetSubmission.approvalComment = comment.trim();
        targetSubmission.reviewer = reviewer.id;
        targetSubmission.reviewedAt = new Date();
      }

      // Thêm vào lịch sử duyệt
      task.approvalHistory = task.approvalHistory || [];
      task.approvalHistory.push({
        action: 'approve',
        comment: comment.trim(),
        reviewer: reviewer.id,
        reviewedAt: new Date()
      });

      // Cập nhật trạng thái task
      task.status = 'approved';
      await task.save();

      return this.#sendResponse(res, 200, true, 'Chấp thuận nhiệm vụ thành công', {
        task,
        approvedSubmission: targetSubmission,
        approvalHistory: task.approvalHistory[task.approvalHistory.length - 1]
      });

    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi chấp thuận nhiệm vụ', null, error.message);
    }
  }

  // API từ chối báo cáo
  async rejectTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { id, taskId, subTaskId, submissionId } = req.params;
      const { comment } = req.body;
      const reviewer = req.user;

      if (!comment || comment.trim() === '') {
        return this.#sendResponse(res, 400, false, 'Lý do từ chối là bắt buộc');
      }

      // Xử lý từ chối subtask
      if (taskId && subTaskId) {
        const parentTask = await Task.findById(taskId);
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ cha');
        }

        const subTask = parentTask.subTasks.id(subTaskId);
        if (!subTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ con');
        }

        // Kiểm tra quyền duyệt
        if (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.position !== 'Giam doc' && parentTask.leader.toString() !== reviewer.id) {
          return this.#sendResponse(res, 403, false, 'Bạn không có quyền duyệt nhiệm vụ này');
        }

        // Tìm submission cụ thể nếu có submissionId
        let targetSubmission = null;
        if (submissionId) {
          console.log('Looking for submissionId in subtask (reject):', submissionId);
          console.log('Available subtask submissions:', subTask.submissions.map(s => ({ id: s._id, fileName: s.fileName })));
          
          targetSubmission = subTask.submissions.id(submissionId);
          if (!targetSubmission) {
            return this.#sendResponse(res, 404, false, `Không tìm thấy submission với ID: ${submissionId} trong subtask. Tổng số submissions: ${subTask.submissions.length}`);
          }
          // Cập nhật submission cụ thể
          targetSubmission.approvalStatus = 'rejected';
          targetSubmission.approvalComment = comment.trim();
          targetSubmission.reviewer = reviewer.id;
          targetSubmission.reviewedAt = new Date();
        } else {
          // Từ chối submission mới nhất
          if (subTask.submissions.length === 0) {
            return this.#sendResponse(res, 400, false, 'Không có submission nào để từ chối');
          }
          targetSubmission = subTask.submissions[subTask.submissions.length - 1];
          targetSubmission.approvalStatus = 'rejected';
          targetSubmission.approvalComment = comment.trim();
          targetSubmission.reviewer = reviewer.id;
          targetSubmission.reviewedAt = new Date();
        }

        // Thêm vào lịch sử duyệt
        subTask.approvalHistory = subTask.approvalHistory || [];
        subTask.approvalHistory.push({
          action: 'reject',
          comment: comment.trim(),
          reviewer: reviewer.id,
          reviewedAt: new Date()
        });

        // Cập nhật trạng thái task về pending để có thể nộp lại
        subTask.status = 'pending';
        await parentTask.save();

        return this.#sendResponse(res, 200, true, 'Từ chối nhiệm vụ con thành công', {
          subTask,
          rejectedSubmission: targetSubmission,
          approvalHistory: subTask.approvalHistory[subTask.approvalHistory.length - 1]
        });
      }

      // Xử lý từ chối task chính
      const mainTaskId = id || taskId;
      const task = await Task.findById(mainTaskId);
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      // Kiểm tra quyền duyệt
      if (reviewer.role !== 'admin' && reviewer.role !== 'manager' && reviewer.position !== 'Giam doc' && task.leader.toString() !== reviewer.id) {
        return this.#sendResponse(res, 403, false, 'Bạn không có quyền duyệt nhiệm vụ này');
      }

              // Tìm submission cụ thể nếu có submissionId
        let targetSubmission = null;
        if (submissionId) {
          console.log('Looking for submissionId in task (reject):', submissionId);
          console.log('Available task submissions:', task.submissions.map(s => ({ id: s._id, fileName: s.fileName })));
          
          targetSubmission = task.submissions.id(submissionId);
          if (!targetSubmission) {
            return this.#sendResponse(res, 404, false, `Không tìm thấy submission với ID: ${submissionId} trong task. Tổng số submissions: ${task.submissions.length}`);
          }
          // Cập nhật submission cụ thể
          targetSubmission.approvalStatus = 'rejected';
          targetSubmission.approvalComment = comment.trim();
          targetSubmission.reviewer = reviewer.id;
          targetSubmission.reviewedAt = new Date();
        } else {
        // Từ chối submission mới nhất
        if (task.submissions.length === 0) {
          return this.#sendResponse(res, 400, false, 'Không có submission nào để từ chối');
        }
        targetSubmission = task.submissions[task.submissions.length - 1];
        targetSubmission.approvalStatus = 'rejected';
        targetSubmission.approvalComment = comment.trim();
        targetSubmission.reviewer = reviewer.id;
        targetSubmission.reviewedAt = new Date();
      }

      // Thêm vào lịch sử duyệt
      task.approvalHistory = task.approvalHistory || [];
      task.approvalHistory.push({
        action: 'reject',
        comment: comment.trim(),
        reviewer: reviewer.id,
        reviewedAt: new Date()
      });

      // Cập nhật trạng thái task về pending để có thể nộp lại
      task.status = 'pending';
      await task.save();

      return this.#sendResponse(res, 200, true, 'Từ chối nhiệm vụ thành công', {
        task,
        rejectedSubmission: targetSubmission,
        approvalHistory: task.approvalHistory[task.approvalHistory.length - 1]
      });

    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi từ chối nhiệm vụ', null, error.message);
    }
  }

  // API lấy lịch sử duyệt
  async getApprovalHistory(req, res) {
    try {
      const { id, taskId, subTaskId } = req.params;

      // Xử lý lấy lịch sử duyệt subtask
      if (taskId && subTaskId) {
        const parentTask = await Task.findById(taskId).populate('approvalHistory.reviewer', 'fullName');
        if (!parentTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ cha');
        }

        const subTask = parentTask.subTasks.id(subTaskId);
        if (!subTask) {
          return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ con');
        }

        // Populate reviewer cho subtask approval history
        const populatedHistory = subTask.approvalHistory ? 
          await Promise.all(subTask.approvalHistory.map(async (history) => {
            const reviewer = await User.findById(history.reviewer).select('fullName');
            return {
              ...history.toObject(),
              reviewer: reviewer ? { _id: reviewer._id, fullName: reviewer.fullName } : null
            };
          })) : [];

        return this.#sendResponse(res, 200, true, 'Lấy lịch sử duyệt nhiệm vụ con thành công', populatedHistory);
      }

      // Xử lý lấy lịch sử duyệt task chính
      const mainTaskId = id || taskId;
      const task = await Task.findById(mainTaskId).populate('approvalHistory.reviewer', 'fullName');
      if (!task) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy nhiệm vụ');
      }

      return this.#sendResponse(res, 200, true, 'Lấy lịch sử duyệt nhiệm vụ thành công', task.approvalHistory || []);

    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy lịch sử duyệt', null, error.message);
    }
  }

  // API: Lấy tất cả nhiệm vụ phân cấp theo chỉ tiêu, nhiệm vụ chính, nhiệm vụ con
  async getAllTasksByHierarchy(req, res) {
    try {
      // Lấy tất cả chỉ tiêu
      const indicators = await Indicator.find({})
        .populate('creator', 'fullName')
        .lean();
      // Lấy tất cả nhiệm vụ chính
      const tasks = await Task.find({})
        .populate('leader', 'fullName')
        .populate('indicator', '_id')
        .populate('subTasks.assignee', 'fullName')
        .lean();
      // Map indicatorId -> mainTasks
      const indicatorTaskMap = {};
      tasks.forEach(task => {
        const indId = task.indicator?._id?.toString() || (task.indicator + '');
        if (!indicatorTaskMap[indId]) indicatorTaskMap[indId] = [];
        indicatorTaskMap[indId].push(task);
      });
      // Build kết quả
      const result = indicators.map(ind => {
        const mainTasks = (indicatorTaskMap[ind._id.toString()] || []).map(task => ({
          _id: task._id,
          leader: task.leader ? { _id: task.leader._id, fullName: task.leader.fullName } : null,
          content: task.content,
          createdAt: task.createdAt,
          status: task.status,
          file: task.file || null, // Thêm trường file hướng dẫn cho mainTask
          subTasks: (task.subTasks || []).map(st => {
            const leaderObj = st.assignee ? { _id: st.assignee._id, fullName: st.assignee.fullName } : null;
            return {
              _id: st._id,
              leader: leaderObj,
              assigner: task.leader ? { _id: task.leader._id, fullName: task.leader.fullName } : null,
              assignee: leaderObj, // Thêm trường assignee giống leader
              content: st.content,
              createdAt: st.createdAt,
              status: st.status,
              file: st.file || null // Thêm trường file hướng dẫn cho subTask
            };
          })
        }));
        return {
          _id: ind._id,
          creator: ind.creator ? { _id: ind.creator._id, fullName: ind.creator.fullName } : null,
          content: ind.name,
          createdAt: ind.createdAt,
          status: ind.status,
          mainTasks
        };
      });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi lấy danh sách chỉ tiêu phân cấp', error: error.message });
    }
  }
}

module.exports = new TaskController();