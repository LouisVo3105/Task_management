const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const IndicatorController = require('../controllers/indicator.controller');
const {authMiddleware} = require('../middlewares/auth.middleware');

// Validation rules
const validateCreateIndicator = [
  body('code').trim().notEmpty().withMessage('Mã chỉ tiêu là bắt buộc'),
  body('name').trim().notEmpty().withMessage('Tên chỉ tiêu là bắt buộc'),
  body('category').isIn(['KHCN', 'ĐMST', 'CĐS']).withMessage('Danh mục không hợp lệ'),
  body('unit').trim().notEmpty().withMessage('Đơn vị tính là bắt buộc'),
  body('department').trim().notEmpty().withMessage('Đơn vị chủ trì là bắt buộc')
];

router.use(authMiddleware);

router.post('/', validateCreateIndicator, (req, res) => IndicatorController.createIndicator(req, res));
router.put('/:id', validateCreateIndicator, (req, res) => IndicatorController.updateIndicator(req, res)); // Thêm validation
router.delete('/:id', (req, res) => IndicatorController.deleteIndicator(req, res));
router.get('/', (req, res) => IndicatorController.getIndicators(req, res));
router.get('/all', (req, res) => IndicatorController.getAllIndicators(req, res));
router.get('/:id', (req, res) => IndicatorController.getIndicatorDetail(req, res));

module.exports = router;