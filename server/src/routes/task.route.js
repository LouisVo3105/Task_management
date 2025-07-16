const express = require('express');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Chuyển tên file về UTF-8
    let originalName = file.originalname;
    if (originalName) {
      originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    }
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const timestamp = Date.now();
    // Tạo tên file an toàn, không lỗi tiếng Việt
    const safeName = `${nameWithoutExt}_${timestamp}${ext}`;
    cb(null, safeName);
  }
});
const upload = multer({ storage });
const router = express.Router();
const TaskController = require('../controllers/task.controller');
const { authMiddleware, roleMiddleware, canManageTask } = require('../middlewares/auth.middleware');
const { validateCreateTask, validateUpdateTask, validateSubmitTask, validateCreateSubTask, validateApproveTask, validateRejectTask } = require('../middlewares/task.validation');
const { updateOverdueStatus } = require('../middlewares/task.middleware');

router.use(authMiddleware);

// Middleware ép supporterIds về mảng
function  forceSupporterIdsArray(req, res, next) {
  // Chỉ xử lý supporterIds nếu request có chứa trường này
  if (req.body && typeof req.body === 'object' && 'supporterIds' in req.body) {
    let value = req.body.supporterIds;
    if (!Array.isArray(value)) {
      value = value ? [value] : [];
    }
    req.body.supporterIds = value;
  }
  next();
}

// Middleware kiểm tra quyền truy cập cho /all
function hierarchyAccessMiddleware(req, res, next) {
  const allowedRoles = ['admin', 'manager'];
  const allowedPositions = ['Giam doc', 'Pho Giam doc', 'Truong phong'];
  if (
    (req.user && allowedRoles.includes(req.user.role)) ||
    (req.user && allowedPositions.includes(req.user.position))
  ) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
}

// Route cụ thể phải đặt trước
router.get('/all', hierarchyAccessMiddleware, TaskController.getAllTasksByHierarchy.bind(TaskController));
router.get('/pending', TaskController.getPendingTasks.bind(TaskController));
router.get('/incomplete/:userId', TaskController.getIncompleteTasks.bind(TaskController));
router.get('/completed/:userId', TaskController.getCompletedTasks.bind(TaskController));
router.get('/overdue', updateOverdueStatus, TaskController.getOverdueTasks.bind(TaskController));
router.get('/search', TaskController.searchTasks.bind(TaskController));

router.post('/', upload.single('file'), forceSupporterIdsArray, roleMiddleware(['admin', 'manager']), validateCreateTask, TaskController.createTask.bind(TaskController));
router.put('/:id',upload.single('file') ,forceSupporterIdsArray,roleMiddleware(['admin', 'manager']), canManageTask, validateUpdateTask, TaskController.updateTask.bind(TaskController));
router.delete('/:id', roleMiddleware(['admin', 'manager']), canManageTask, TaskController.deleteTask.bind(TaskController));
router.get('/:id/subtasks', TaskController.getSubTasks.bind(TaskController));
router.get('/:id', TaskController.getTaskDetail.bind(TaskController));
router.patch('/:id/submit', upload.single('file'), validateSubmitTask, TaskController.submitTask.bind(TaskController));
router.get('/:id/submissions', TaskController.getTaskSubmissions.bind(TaskController));
router.get('/:taskId/subtasks/:subTaskId/submissions', TaskController.getSubTaskSubmissions.bind(TaskController));
router.post('/:parentTaskId/subtasks',upload.single('file'), roleMiddleware(['admin', 'manager']), validateCreateSubTask, TaskController.createSubTask.bind(TaskController));
router.patch('/:taskId/subtasks/:subTaskId/submit', upload.single('file'), validateSubmitTask, TaskController.submitTask.bind(TaskController));

// Routes cho approve/reject
router.patch('/:id/approve', roleMiddleware(['admin', 'manager']), canManageTask, validateApproveTask, TaskController.approveTask.bind(TaskController));
router.patch('/:id/reject', roleMiddleware(['admin', 'manager']), canManageTask, validateRejectTask, TaskController.rejectTask.bind(TaskController));
router.get('/:id/approval-history', TaskController.getApprovalHistory.bind(TaskController));

// Routes cho subtask approve/reject
router.patch('/:taskId/subtasks/:subTaskId/approve', roleMiddleware(['admin', 'manager']), canManageTask, validateApproveTask, TaskController.approveTask.bind(TaskController));
router.patch('/:taskId/subtasks/:subTaskId/reject', roleMiddleware(['admin', 'manager']), canManageTask, validateRejectTask, TaskController.rejectTask.bind(TaskController));
router.get('/:taskId/subtasks/:subTaskId/approval-history', TaskController.getApprovalHistory.bind(TaskController));

// Routes cho approve/reject submission cụ thể (task chính)
router.patch('/:id/submissions/:submissionId/approve', roleMiddleware(['admin', 'manager']), canManageTask, validateApproveTask, TaskController.approveTask.bind(TaskController));
router.patch('/:id/submissions/:submissionId/reject', roleMiddleware(['admin', 'manager']), canManageTask, validateRejectTask, TaskController.rejectTask.bind(TaskController));

// Routes cho approve/reject submission cụ thể (subtask)
router.patch('/:taskId/subtasks/:subTaskId/submissions/:submissionId/approve', roleMiddleware(['admin', 'manager']), canManageTask, validateApproveTask, TaskController.approveTask.bind(TaskController));
router.patch('/:taskId/subtasks/:subTaskId/submissions/:submissionId/reject', roleMiddleware(['admin', 'manager']), canManageTask, validateRejectTask, TaskController.rejectTask.bind(TaskController));

module.exports = router;