const { body } = require('express-validator');

const validateCreateTask = [
  body('code').trim().notEmpty().withMessage('Mã nhiệm vụ là bắt buộc'),
  body('title').trim().notEmpty().withMessage('Tên nhiệm vụ là bắt buộc'),
  body('endDate').isDate().withMessage('Deadline không hợp lệ'),
  body('indicatorId').isMongoId().withMessage('ID chỉ tiêu không hợp lệ'),
  body('parentTaskId').optional().isMongoId().withMessage('ID nhiệm vụ cha không hợp lệ'),
  body('assigneeId')
    .if(body('parentTaskId').exists())
    .isMongoId()
    .withMessage('ID người thực hiện không hợp lệ'),
  body('notes').optional().isString().withMessage('Ghi chú phải là chuỗi')
];

const validateUpdateTask = [
  body('code').optional().trim().notEmpty().withMessage('Mã nhiệm vụ là bắt buộc'),
  body('title').optional().trim().notEmpty().withMessage('Tên nhiệm vụ là bắt buộc'),
  body('endDate').optional().isDate().withMessage('Deadline không hợp lệ'),
  body('indicatorId').optional().isMongoId().withMessage('ID chỉ tiêu không hợp lệ'),
  body('parentTaskId').optional().isMongoId().withMessage('ID nhiệm vụ cha không hợp lệ'),
  body('assigneeId').optional().isMongoId().withMessage('ID người thực hiện không hợp lệ'),
  body('notes').optional().isString().withMessage('Ghi chú phải là chuỗi')
];

const validateSubmitTask = [
  body('submitNote').optional().isString().withMessage('Ghi chú nộp nhiệm vụ phải là chuỗi'),
  body('submitLink').optional().isURL().withMessage('Link báo cáo không hợp lệ')
];

module.exports = { validateCreateTask, validateUpdateTask, validateSubmitTask };