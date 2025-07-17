const indicatorService = require('../services/indicator.service');
const { validationResult } = require('express-validator');
const { checkLeaderPermission, checkOverdueStatus } = require('../middlewares/indicator.middleware');
const { broadcastSSE, sendSseToastToUser } = require('../services/sse.service');

class IndicatorController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createIndicator(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendSseToastToUser(req.user.id, 'error', 'Dữ liệu không hợp lệ');
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }
    checkOverdueStatus(req, res, () => {
      checkLeaderPermission(req, res, async () => {
    try {
      const { name, endDate } = req.body;
          const indicator = await indicatorService.createIndicator({ name, endDate, creator: req.user.id });
      this.#sendResponse(res, 201, true, 'Chỉ tiêu đã được tạo', indicator);
      sendSseToastToUser(req.user.id, 'success', 'Tạo chỉ tiêu thành công!');
          broadcastSSE('indicator_created', { indicatorId: indicator._id, indicator });
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi tạo chỉ tiêu');
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo chỉ tiêu', null, error.message);
    }
  });
});
  }

  async updateIndicator(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendSseToastToUser(req.user.id, 'error', 'Dữ liệu không hợp lệ');
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }
    checkOverdueStatus(req, res, () => {
      checkLeaderPermission(req, res, async () => {
    try {
      const { id } = req.params;
      const updateData = req.body;
          const indicator = await indicatorService.updateIndicator(id, updateData);
      this.#sendResponse(res, 200, true, 'Cập nhật chỉ tiêu thành công', indicator);
      sendSseToastToUser(req.user.id, 'success', 'Cập nhật chỉ tiêu thành công!');
          broadcastSSE('indicator_updated', { indicatorId: indicator._id, indicator });
    } catch (error) {
          sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi cập nhật chỉ tiêu');
          this.#sendResponse(res, error.status || 500, false, 'Lỗi khi cập nhật chỉ tiêu', null, error.message);
    }
  });
});
  }

  async deleteIndicator(req, res) {
    checkOverdueStatus(req, res, () => {
      checkLeaderPermission(req, res, async () => {
    try {
      const { id } = req.params;
          await indicatorService.deleteIndicator(id);
          this.#sendResponse(res, 200, true, 'Xóa chỉ tiêu thành công');
          sendSseToastToUser(req.user.id, 'success', 'Xóa chỉ tiêu thành công!');
          broadcastSSE('indicator_deleted', { indicatorId: id });
    } catch (error) {
          sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi xóa chỉ tiêu');
          this.#sendResponse(res, error.status || 500, false, 'Lỗi khi xóa chỉ tiêu', null, error.message);
    }
  });
});
  }

  async getIndicators(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const data = await indicatorService.getIndicators(page, limit);
      this.#sendResponse(res, 200, true, 'Lấy danh sách chỉ tiêu thành công', data);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách chỉ tiêu', null, error.message);
    }
  }

  async approveNewIndicator(req, res) {
    checkLeaderPermission(req, res, async () => {
      try {
        const { oldIndicatorId, name, endDate } = req.body;
        const newIndicator = await indicatorService.approveNewIndicator({ oldIndicatorId, name, endDate, creator: req.user.id });
        this.#sendResponse(res, 201, true, 'Chỉ tiêu mới đã được tạo và phê duyệt', newIndicator);
      } catch (error) {
        this.#sendResponse(res, error.status || 500, false, 'Lỗi khi phê duyệt tạo chỉ tiêu mới', null, error.message);
      }
    });
  }

  async getIndicatorTasks(req, res) {
    try {
      const { id } = req.params;
      const data = await indicatorService.getIndicatorTasks(id);
      this.#sendResponse(res, 200, true, 'Lấy danh sách nhiệm vụ thành công', data);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, 'Lỗi khi lấy danh sách nhiệm vụ', null, error.message);
    }
  }

  async getParticipatedIndicators(req, res) {
    try {
      const userId = req.user.id;
      const indicators = await indicatorService.getParticipatedIndicators(userId);
      this.#sendResponse(res, 200, true, 'Lấy danh sách chỉ tiêu tham gia thành công', indicators);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy chỉ tiêu tham gia', null, error.message);
    }
  }
}

module.exports = new IndicatorController();