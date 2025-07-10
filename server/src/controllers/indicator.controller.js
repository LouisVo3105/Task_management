const Indicator = require('../models/indicator.model');
const Task = require('../models/task.model');
const { validationResult } = require('express-validator');

class IndicatorController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createIndicator(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { name, endDate } = req.body;
      const indicator = new Indicator({ name, endDate, creator: req.user.id });
      await indicator.save();
      this.#sendResponse(res, 201, true, 'Chỉ tiêu đã được tạo', indicator);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo chỉ tiêu', null, error.message);
    }
  }

  async updateIndicator(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      const { id } = req.params;
      const updateData = req.body;

      const indicator = await Indicator.findByIdAndUpdate(id, updateData, { new: true });
      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      this.#sendResponse(res, 200, true, 'Cập nhật chỉ tiêu thành công', indicator);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi cập nhật chỉ tiêu', null, error.message);
    }
  }

  async deleteIndicator(req, res) {
    try {
      const { id } = req.params;
      const indicator = await Indicator.findByIdAndDelete(id);
      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      await Task.deleteMany({ indicator: id }); // Xóa các nhiệm vụ liên quan
      this.#sendResponse(res, 200, true, 'Xóa chỉ tiêu thành công');
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi xóa chỉ tiêu', null, error.message);
    }
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
}

module.exports = new IndicatorController();