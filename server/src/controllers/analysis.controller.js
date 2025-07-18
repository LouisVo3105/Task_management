"use strict";
const analysisService = require('../services/analysis.service');
const { sendSseToastToUser } = require('../services/sse.service');

class AnalysisController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async getOverallStats(req, res) {
    try {
      const stats = await analysisService.getOverallStats();
      this.#sendResponse(res, 200, true, 'Lấy dữ liệu phân tích tổng quan thành công', stats);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy dữ liệu phân tích tổng quan', null, error.message);
    }
  }

  async getUserPerformance(req, res) {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const userPerformance = await analysisService.getUserPerformance(limit);
      this.#sendResponse(res, 200, true, 'Lấy dữ liệu hiệu suất người dùng thành công', userPerformance);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy dữ liệu hiệu suất người dùng', null, error.message);
    }
  }

  async getIndicatorProgress(req, res) {
    try {
      const result = await analysisService.getIndicatorProgress();
      this.#sendResponse(res, 200, true, 'Tiến độ hoàn thành của từng chỉ tiêu', result);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy tiến độ chỉ tiêu', null, error.message);
    }
  }

  async getDepartmentProgress(req, res) {
    try {
      const result = await analysisService.getDepartmentProgress();
      this.#sendResponse(res, 200, true, 'Mức độ hoàn thành nhiệm vụ của từng phòng ban', result);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy tiến độ phòng ban', null, error.message);
    }
  }

  async getDepartmentTaskSummary(req, res) {
    try {
      const user = req.user;
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);
      const result = await analysisService.getDepartmentTaskSummary(user, month, year);
      this.#sendResponse(res, 200, true, 'Thống kê nhiệm vụ chính theo phòng ban', result);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy thống kê nhiệm vụ phòng ban', null, error.message);
    }
  }
}

module.exports = new AnalysisController();