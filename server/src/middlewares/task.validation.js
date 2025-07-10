const { body } = require('express-validator');

const validateCreateTask = [
  body('title').trim().notEmpty().withMessage('Tên nhiệm vụ là bắt buộc'),
  body('content').trim().notEmpty().withMessage('Nội dung nhiệm vụ là bắt buộc'),
  body('endDate').isDate().withMessage('Deadline không hợp lệ'),
  body('indicatorId').isMongoId().withMessage('ID chỉ tiêu không hợp lệ'),
  body('departmentId').isMongoId().withMessage('Phòng ban là bắt buộc'),
  body('leaderId').isMongoId().withMessage('Người chủ trì là bắt buộc'),
  body('supporterIds').isArray({ min: 1 }).withMessage('Cần ít nhất 1 người hỗ trợ'),
  body('supporterIds.*').isMongoId().withMessage('ID người hỗ trợ không hợp lệ'),
  body('parentTaskId').optional().isMongoId().withMessage('ID nhiệm vụ cha không hợp lệ'),
  body('assigneeId')
    .if(body('parentTaskId').exists())
    .isMongoId()
    .withMessage('ID người thực hiện không hợp lệ'),
  body('notes').optional().isString().withMessage('Ghi chú phải là chuỗi')
];

const validateUpdateTask = [
  body('title').optional().trim().notEmpty().withMessage('Tên nhiệm vụ là bắt buộc'),
  body('content').optional().trim().notEmpty().withMessage('Nội dung nhiệm vụ là bắt buộc'),
  body('endDate').optional().isDate().withMessage('Deadline không hợp lệ'),
  body('indicatorId').optional().isMongoId().withMessage('ID chỉ tiêu không hợp lệ'),
  body('departmentId').optional().isMongoId().withMessage('Phòng ban không hợp lệ'),
  body('leaderId').optional().isMongoId().withMessage('Người chủ trì không hợp lệ'),
  body('supporterIds').optional().custom((value) => {
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error('supporterIds phải là mảng');
    }
    return true;
  }),
  body('supporterIds.*').optional().isMongoId().withMessage('ID người hỗ trợ không hợp lệ'),
  body('parentTaskId').optional().isMongoId().withMessage('ID nhiệm vụ cha không hợp lệ'),
  body('assigneeId').optional().isMongoId().withMessage('ID người thực hiện không hợp lệ'),
  body('notes').optional().isString().withMessage('Ghi chú phải là chuỗi'),
  body('status').optional().isIn(['pending', 'submitted', 'approved', 'overdue']).withMessage('Trạng thái không hợp lệ')
];

const validateSubmitTask = [
  // Không cần body('file').notEmpty() nữa, vì multer sẽ kiểm tra
  body('link').optional().isString().withMessage('Link báo cáo phải là chuỗi'),
  body('submitLink').optional().isString().withMessage('Link báo cáo phải là chuỗi'),
  body('note').optional().isString().withMessage('Ghi chú nộp nhiệm vụ phải là chuỗi'),
  body('submitNote').optional().isString().withMessage('Ghi chú nộp nhiệm vụ phải là chuỗi')
];

const validateCreateSubTask = [
  body('title').trim().notEmpty().withMessage('Tên nhiệm vụ là bắt buộc'),
  body('content').trim().notEmpty().withMessage('Nội dung nhiệm vụ là bắt buộc'),
  body('endDate').isISO8601().withMessage('Deadline không hợp lệ'),
  body('assigneeId').isMongoId().withMessage('ID người thực hiện là bắt buộc'),
  body('notes').optional().isString().withMessage('Ghi chú phải là chuỗi'),
];

module.exports = {
  validateCreateTask,
  validateUpdateTask,
  validateSubmitTask,
  validateCreateSubTask
};