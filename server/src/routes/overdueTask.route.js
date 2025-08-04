"use strict";
const express = require('express');
const router = express.Router();
const overdueTaskController = require('../controllers/overdueTask.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Tạo nhiệm vụ mới khi quá hạn
router.post('/:taskId/clone',authMiddleware, overdueTaskController.cloneOverdueTask);

// Lấy danh sách nhân viên bị quá hạn nhiệm vụ
router.get('/warnings', overdueTaskController.getOverdueWarnings);

// Xuất file Excel/CSV danh sách nhân viên bị cảnh cáo
router.get('/warnings/export', overdueTaskController.exportOverdueWarnings);

// Lấy danh sách chỉ tiêu quá hạn
router.get('/indicators', overdueTaskController.getOverdueIndicators);

// Xuất file Excel/CSV danh sách chỉ tiêu quá hạn
router.get('/indicators/export', overdueTaskController.exportOverdueIndicators);

// Tạo lại chỉ tiêu quá hạn
router.post('/indicators/:indicatorId/clone', authMiddleware, overdueTaskController.cloneOverdueIndicator);

module.exports = router; 