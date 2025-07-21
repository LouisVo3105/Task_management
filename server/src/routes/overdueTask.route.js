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

module.exports = router; 