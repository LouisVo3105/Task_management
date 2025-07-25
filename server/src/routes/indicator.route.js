const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const IndicatorController = require('../controllers/indicator.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

const validateCreateIndicator = [
  body('name').trim().notEmpty().withMessage('Tên chỉ tiêu là bắt buộc'),
  body('endDate').isDate().withMessage('Deadline chỉ tiêu không hợp lệ')
];

const validateUpdateIndicator = [
  body('name').optional().trim().notEmpty().withMessage('Tên chỉ tiêu không được để trống'),
  body('endDate').optional().isDate().withMessage('Deadline chỉ tiêu không hợp lệ')
];

router.use(authMiddleware);

router.post('/', roleMiddleware(['admin', 'manager', 'director']), validateCreateIndicator, IndicatorController.createIndicator.bind(IndicatorController));
router.put('/:id', roleMiddleware(['admin', 'manager', 'director']), validateUpdateIndicator, IndicatorController.updateIndicator.bind(IndicatorController));
router.delete('/:id', roleMiddleware(['admin', 'manager', 'director']), IndicatorController.deleteIndicator.bind(IndicatorController));
router.get('/', IndicatorController.getIndicators.bind(IndicatorController));
router.get('/:id/tasks', roleMiddleware(['admin', 'manager', 'director']), IndicatorController.getIndicatorTasks.bind(IndicatorController));

module.exports = router;