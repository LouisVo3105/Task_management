const Indicator = require('../models/indicator.model');
const Task = require('../models/task.model');
const { validationResult } = require('express-validator');
const {checkLeaderPermission,checkOverdueStatus} =require('../middlewares/indicator.middleware')
const { broadcastSSE } = require('../services/sse.service');

class IndicatorController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createIndicator(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    checkOverdueStatus(req, res, async() =>{
    
    checkLeaderPermission(req, res, async() =>{
    try {
      const { name, endDate } = req.body;
      const indicator = new Indicator({ name, endDate, creator: req.user.id });
      await indicator.save();
      this.#sendResponse(res, 201, true, 'Chỉ tiêu đã được tạo', indicator);
      // Sau khi tạo chỉ tiêu thành công
      broadcastSSE('indicator_created', { indicatorId: indicator._id, indicator });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo chỉ tiêu', null, error.message);
    }
  });
});
  }

  async updateIndicator(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

checkOverdueStatus(req, res, async() =>{
    checkLeaderPermission(req, res, async() =>{
    try {
      const { id } = req.params;
      const updateData = req.body;

      const indicator = await Indicator.findByIdAndUpdate(id, updateData, { new: true });
      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      this.#sendResponse(res, 200, true, 'Cập nhật chỉ tiêu thành công', indicator);
      // Sau khi cập nhật chỉ tiêu thành công
      broadcastSSE('indicator_updated', { indicatorId: indicator._id, indicator });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi cập nhật chỉ tiêu', null, error.message);
    }
  });
});
  }

  async deleteIndicator(req, res) {
    checkOverdueStatus(req, res, async() =>{
    checkLeaderPermission(req, res, async() =>{
    try {
      const { id } = req.params;
      const Comment = require('../models/comment.model');
      const fs = require('fs');
      
      const indicator = await Indicator.findByIdAndDelete(id);
      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      // Lấy tất cả task liên quan để xóa file
      const tasks = await Task.find({ indicator: id });
      
      // Xóa file của tất cả task và subtask
      for (const task of tasks) {
        // Xóa file của task chính
        if (task.file) {
          try {
            fs.unlinkSync(task.file);
          } catch (err) {
            console.log('Task file không tồn tại:', task.file);
          }
        }
        
        // Xóa files của submissions của task chính
        if (task.submissions) {
          task.submissions.forEach(submission => {
            if (submission.file) {
              try {
                fs.unlinkSync(submission.file);
              } catch (err) {
                console.log('Task submission file không tồn tại:', submission.file);
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
      }

      await Task.deleteMany({ indicator: id }); // Xóa các nhiệm vụ liên quan
      await Comment.deleteMany({ indicatorId: id }); // Xóa các comment liên quan
      this.#sendResponse(res, 200, true, 'Xóa chỉ tiêu thành công');
      // Sau khi xóa chỉ tiêu thành công
      broadcastSSE('indicator_deleted', { indicatorId: id });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi xóa chỉ tiêu', null, error.message);
    }
  });
});
  }

  async getIndicators(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: 'name endDate _id createdAt'
      };

      const indicators = await Indicator.paginate({}, options);
      
      // Tính toán trạng thái hoàn thành cho từng chỉ tiêu
      const indicatorsWithStatus = await Promise.all(
        indicators.docs.map(async (indicator) => {
          // Lấy tất cả nhiệm vụ thuộc chỉ tiêu này (cả nhiệm vụ chính và nhiệm vụ con)
          const tasks = await Task.find({ 
            indicator: indicator._id,
            parentTask: null // Chỉ lấy nhiệm vụ chính
          }).lean();

          let completedTasks = 0;
          let totalTasks = 0;

          // Tính toán cho nhiệm vụ chính
          for (const task of tasks) {
            totalTasks++;
            if (task.status === 'approved') {
              completedTasks++;
            }
            // Bỏ logic tính subtask - chỉ tính nhiệm vụ chính đã approved
          }

          // Tính phần trăm hoàn thành
          const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          // Xác định trạng thái tổng thể
          let overallStatus = 'not_started';
          if (totalTasks === 0) {
            overallStatus = 'no_tasks';
          } else if (completedTasks === totalTasks) {
            overallStatus = 'completed';
          } else if (completedTasks > 0) {
            overallStatus = 'in_progress';
          }

          return {
            ...indicator.toObject(),
            status: {
              completed: completedTasks,
              total: totalTasks,
              percentage: completionPercentage,
              overallStatus: overallStatus
            }
          };
        })
      );

      // Cập nhật lại data trong response
      const responseData = {
        ...indicators,
        docs: indicatorsWithStatus
      };

      this.#sendResponse(res, 200, true, 'Lấy danh sách chỉ tiêu thành công', responseData);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách chỉ tiêu', null, error.message);
    }
  }

  async approveNewIndicator(req, res) {
    checkLeaderPermission(req, res, async () => {
      try {
        const { oldIndicatorId, name, endDate } = req.body;
        const oldIndicator = await Indicator.findById(oldIndicatorId);
        if (!oldIndicator || !oldIndicator.isOverdue) {
          return this.#sendResponse(res, 400, false, 'Chỉ tiêu cũ không tồn tại hoặc chưa quá hạn');
        }
  
        const newIndicator = new Indicator({ name, endDate, creator: req.user.id });
        await newIndicator.save();
  
        // Đánh dấu chỉ tiêu cũ là hoàn thành (hoặc giữ nguyên tùy logic)
        oldIndicator.status = 'completed';
        await oldIndicator.save();
  
        this.#sendResponse(res, 201, true, 'Chỉ tiêu mới đã được tạo và phê duyệt', newIndicator);
      } catch (error) {
        this.#sendResponse(res, 500, false, 'Lỗi khi phê duyệt tạo chỉ tiêu mới', null, error.message);
      }
    });
  }

  async getIndicatorTasks(req, res) {
    try {
      const { id } = req.params;
      const indicator = await Indicator.findById(id);
      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      const tasks = await Task.find({ indicator: id, parentTask: null })
        .select('title endDate _id status subTasks department createdAt')
        .populate({ path: 'department', select: '_id name' })
        .lean();

      let completedTasks = 0;
      let totalTasks = 0;

      // Tính toán progress với logic nhất quán
      for (const task of tasks) {
        totalTasks++;
        if (task.status === 'approved') {
          completedTasks++;
        }
        // Bỏ logic tính subtask - chỉ tính nhiệm vụ chính đã approved
      }

      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ thành công', { 
        tasks, 
        progress,
        status: {
          completed: completedTasks,
          total: totalTasks,
          percentage: progress
        }
      });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách nhiệm vụ', null, error.message);
    }
  }

  // API: Lấy các chỉ tiêu mà user có tham gia
  async getParticipatedIndicators(req, res) {
    try {
      const userId = req.user.id;
      const Task = require('../models/task.model');
      const Indicator = require('../models/indicator.model');

      // 1. Nhiệm vụ chính mà user là leader hoặc supporter
      const mainTasks = await Task.find({
        $or: [
          { leader: userId },
          { supporters: userId }
        ]
      }).select('indicator');

      // 2. Nhiệm vụ con mà user là assignee
      const subTasks = await Task.find({
        'subTasks.assignee': userId
      }).select('indicator subTasks');

      // Lấy tất cả indicatorId liên quan
      const indicatorIds = new Set();
      mainTasks.forEach(t => t.indicator && indicatorIds.add(t.indicator.toString()));
      subTasks.forEach(t => {
        if (t.indicator) {
          // Kiểm tra user có thực sự là assignee của subtask nào không
          t.subTasks.forEach(st => {
            if (st.assignee && st.assignee.toString() === userId) {
              indicatorIds.add(t.indicator.toString());
            }
          });
        }
      });

      // 3. (Có thể mở rộng: user là creator của indicator)
      // const createdIndicators = await Indicator.find({ creator: userId }).select('_id');
      // createdIndicators.forEach(ind => indicatorIds.add(ind._id.toString()));

      // Lấy thông tin chỉ tiêu
      const indicators = await Indicator.find({ _id: { $in: Array.from(indicatorIds) } });
      this.#sendResponse(res, 200, true, 'Lấy danh sách chỉ tiêu tham gia thành công', indicators);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy chỉ tiêu tham gia', null, error.message);
    }
  }
}

module.exports = new IndicatorController();