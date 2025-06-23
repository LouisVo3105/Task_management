'use strict';

const Indicator = require('../models/indicator.model');
const { validationResult } = require('express-validator');

class IndicatorController {
  // Response chuẩn hóa
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  // Tạo chỉ tiêu mới (chỉ admin)
  async createIndicator(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      if (req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Chỉ admin có quyền tạo chỉ tiêu');
      }

      const { code, name, description, category, unit, department, notes } = req.body;

      const existingIndicator = await Indicator.findOne({ code });
      if (existingIndicator) {
        return this.#sendResponse(res, 409, false, 'Mã chỉ tiêu đã tồn tại');
      }

      const indicator = new Indicator({
        code, name, description, category, unit, department, notes, createdBy: req.user.id
      });

      await indicator.save();
      this.#sendResponse(res, 201, true, 'Chỉ tiêu đã được tạo thành công', indicator);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo chỉ tiêu', null, error.message);
    }
  }

  // Cập nhật chỉ tiêu (chỉ admin)
  async updateIndicator(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.#sendResponse(res, 400, false, 'Dữ liệu không hợp lệ', null, errors.array());
    }

    try {
      if (req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Chỉ admin có quyền cập nhật chỉ tiêu');
      }

      const { id } = req.params;
      const updateData = req.body;
      delete updateData.code; // Không cho phép cập nhật mã chỉ tiêu

      const indicator = await Indicator.findByIdAndUpdate(
        id, 
        updateData,
        { new: true, runValidators: true }
      );

      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      this.#sendResponse(res, 200, true, 'Cập nhật chỉ tiêu thành công', indicator);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi cập nhật chỉ tiêu', null, error.message);
    }
  }

  // Xóa chỉ tiêu (soft delete, chỉ admin)
  async deleteIndicator(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return this.#sendResponse(res, 403, false, 'Chỉ admin có quyền xóa chỉ tiêu');
      }

      const { id } = req.params;
      const indicator = await Indicator.findByIdAndUpdate(
        id, 
        { status: 'archived' },
        { new: true }
      );

      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      this.#sendResponse(res, 200, true, 'Đã lưu chỉ tiêu vào kho lưu trữ', indicator);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lưu trữ chỉ tiêu', null, error.message);
    }
  }

  // Lấy danh sách chỉ tiêu (active)
  async getIndicators(req, res) {
    try {
      const { page = 1, limit = 10, category, department, status, search } = req.query;
      const query = {};

      // Lọc theo trạng thái nếu được chỉ định, mặc định là 'active'
      if (status && status !== 'all') {
        query.status = status;
      } else if (!status) {
        query.status = 'active'; // Mặc định chỉ lấy active nếu không có status
      }

      if (category) query.category = category;
      if (department) query.department = department;
      if (search) {
        query.$or = [
          { code: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: 'code name category unit department status createdAt'
      };

      const indicators = await Indicator.paginate(query, options);
      this.#sendResponse(res, 200, true, 'Lấy danh sách chỉ tiêu thành công', indicators);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách chỉ tiêu', null, error.message);
    }
  }

  // Lấy tất cả chỉ tiêu (bất kể trạng thái)
  async getAllIndicators(req, res) {
    try {
      const { page = 1, limit = 10, category, department, search } = req.query;
      const query = {};

      if (category) query.category = category;
      if (department) query.department = department;
      if (search) {
        query.$or = [
          { code: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        select: 'code name category unit department status createdAt',
        populate: { path: 'createdBy', select: 'fullName position' }
      };

      const indicators = await Indicator.paginate(query, options);
      this.#sendResponse(res, 200, true, 'Lấy tất cả chỉ tiêu thành công', indicators);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy tất cả chỉ tiêu', null, error.message);
    }
  }

  // Lấy chi tiết chỉ tiêu
  async getIndicatorDetail(req, res) {
    try {
      const { id } = req.params;
      const indicator = await Indicator.findById(id)
        .populate('createdBy', 'fullName position')
        .select('-__v');

      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }

      this.#sendResponse(res, 200, true, 'Lấy chi tiết chỉ tiêu thành công', indicator);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy chi tiết chỉ tiêu', null, error.message);
    }
  }
}

module.exports = new IndicatorController();