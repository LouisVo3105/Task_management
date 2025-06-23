const { body } = require('express-validator');

const validateTask = [
  body('title').trim().notEmpty().withMessage('Tiêu đề là bắt buộc'),
  body('description').trim().notEmpty().withMessage('Mô tả là bắt buộc'),
  body('indicatorId').isMongoId().withMessage('Chỉ tiêu không hợp lệ'),
  body('assigneeId').isMongoId().withMessage('Người nhận không hợp lệ'),
  body('startDate').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('startDate').custom((value, { req }) => {
    if (new Date(value) > new Date(req.body.endDate)) {
      throw new Error('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
    }
    return true;
  })
];

const validateSubTask = [
  body('title').trim().notEmpty().withMessage('Tiêu đề là bắt buộc'),
  body('assigneeId').isMongoId().withMessage('Người nhận không hợp lệ'),
  body('startDate').isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
  body('startDate').custom((value, { req }) => {
    if (new Date(value) > new Date(req.body.endDate)) {
      throw new Error('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
    }
    return true;
  })
];

const validateSubmit = [
  body('report').trim().optional().isString().withMessage('Báo cáo phải là chuỗi')
];

module.exports = { validateTask, validateSubTask, validateSubmit };