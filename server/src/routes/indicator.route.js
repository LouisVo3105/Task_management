const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const IndicatorController = require('../controllers/indicator.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

const validateCreateIndicator = [
  body('code').trim().notEmpty().withMessage('Mã chỉ tiêu là bắt buộc'),
  body('name').trim().notEmpty().withMessage('Tên chỉ tiêu là bắt buộc')
];

const validateUpdateIndicator = [
  body('name').optional().trim().notEmpty().withMessage('Tên chỉ tiêu không được để trống')
];

router.use(authMiddleware);

router.post('/', roleMiddleware(['admin', 'manager']), validateCreateIndicator, IndicatorController.createIndicator.bind(IndicatorController));
router.put('/:id', roleMiddleware(['admin', 'manager']), validateUpdateIndicator, IndicatorController.updateIndicator.bind(IndicatorController));
router.delete('/:id', roleMiddleware(['admin', 'manager']), IndicatorController.deleteIndicator.bind(IndicatorController));
router.get('/', IndicatorController.getIndicators.bind(IndicatorController));
router.get('/:id/tasks', roleMiddleware(['admin', 'manager']), IndicatorController.getIndicatorTasks.bind(IndicatorController));

module.exports = router;