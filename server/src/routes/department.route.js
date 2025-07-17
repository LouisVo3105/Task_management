const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/department.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Lấy danh sách phòng ban
  router.get('/', DepartmentController.getDepartments.bind(DepartmentController));
// Lấy danh sách trưởng phòng của phòng ban
router.get('/:id/leaders', DepartmentController.getLeaders.bind(DepartmentController));
// Lấy danh sách nhân viên của phòng ban
router.get('/:id/supporters', DepartmentController.getSupporters.bind(DepartmentController));

module.exports = router; 