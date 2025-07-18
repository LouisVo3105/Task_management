"use strict";
const departmentService = require('../services/department.service');
const { sendSseToastToUser } = require('../services/sse.service');

class DepartmentController {
  async getDepartments(req, res) {
    try {
      const departments = await departmentService.getDepartments();
      res.json({ success: true, data: departments });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phòng ban', error: error.message });
    }
  }

  async getLeaders(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const leaders = await departmentService.getLeaders(id, page, limit);
      res.json({ success: true, data: leaders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi lấy trưởng phòng', error: error.message });
    }
  }

  async getSupporters(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const supporters = await departmentService.getSupporters(id, page, limit);
      res.json({ success: true, data: supporters });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi lấy nhân viên hỗ trợ', error: error.message });
    }
  }
}

module.exports = new DepartmentController(); 