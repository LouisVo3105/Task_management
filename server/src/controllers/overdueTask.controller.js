"use strict";
const overdueTaskService = require('../services/overdueTask.service');
const { sendSseToastToUser } = require('../services/sse.service');

// Tạo nhiệm vụ mới khi quá hạn
exports.cloneOverdueTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { newDeadline } = req.body;
    const newTask = await overdueTaskService.cloneOverdueTask(taskId, newDeadline, req.user);
    sendSseToastToUser(req.user.id, 'success', 'Tạo nhiệm vụ mới thành công!');
    res.status(201).json({ message: 'Tạo nhiệm vụ mới thành công', data: newTask });
  } catch (error) {
    sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi tạo nhiệm vụ mới');
    res.status(500).json({ message: 'Lỗi khi tạo nhiệm vụ mới', error: error.message });
  }
};

// Lấy danh sách nhân viên bị quá hạn nhiệm vụ
exports.getOverdueWarnings = async (req, res) => {
  try {
    const { quarter, year, page, limit } = req.query;
    const result = await overdueTaskService.getOverdueWarnings({ quarter, year, page, limit });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy danh sách cảnh cáo', error: error.message });
  }
};

// Xuất file Excel/CSV danh sách nhân viên bị cảnh cáo
exports.exportOverdueWarnings = async (req, res) => {
  try {
    const { quarter, year, type } = req.query;
    const file = await overdueTaskService.exportOverdueWarnings({ quarter, year, type });
    res.setHeader('Content-Disposition', `attachment; filename=overdue_warnings.${type === 'excel' ? 'xlsx' : 'csv'}`);
    res.setHeader('Content-Type', type === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
    res.send(file);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xuất file cảnh cáo', error: error.message });
  }
}; 