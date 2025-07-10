const express = require('express');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Giữ nguyên tên file gốc, chỉ thêm timestamp để tránh trùng lặp
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    cb(null, `${nameWithoutExt}_${timestamp}${ext}`);
  }
});
const upload = multer({ storage });
const router = express.Router();
const TaskController = require('../controllers/task.controller');
const { authMiddleware, roleMiddleware, canManageTask } = require('../middlewares/auth.middleware');
const { validateCreateTask, validateUpdateTask, validateSubmitTask, validateCreateSubTask } = require('../middlewares/task.validation');
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

// Route cụ thể phải đặt trước
router.get('/pending', TaskController.getPendingTasks.bind(TaskController));
router.get('/incomplete/:userId', TaskController.getIncompleteTasks.bind(TaskController));
router.get('/completed/:userId', TaskController.getCompletedTasks.bind(TaskController));
router.get('/overdue', updateOverdueStatus, TaskController.getOverdueTasks.bind(TaskController));
router.get('/search', TaskController.searchTasks.bind(TaskController));

router.post('/', upload.single('file'), forceSupporterIdsArray, roleMiddleware(['admin', 'manager', 'director']), validateCreateTask, TaskController.createTask.bind(TaskController));
router.put('/:id',upload.single('file') ,forceSupporterIdsArray,roleMiddleware(['admin', 'manager', 'director']), canManageTask, validateUpdateTask, TaskController.updateTask.bind(TaskController));
router.delete('/:id', roleMiddleware(['admin', 'manager', 'director']), canManageTask, TaskController.deleteTask.bind(TaskController));
router.get('/:id/subtasks', TaskController.getSubTasks.bind(TaskController));
router.get('/:id', TaskController.getTaskDetail.bind(TaskController));
router.patch('/:id/submit', upload.single('file'), validateSubmitTask, TaskController.submitTask.bind(TaskController));
router.get('/:id/submissions', TaskController.getTaskSubmissions.bind(TaskController));
router.get('/:taskId/subtasks/:subTaskId/submissions', TaskController.getSubTaskSubmissions.bind(TaskController));
router.post('/:parentTaskId/subtasks',upload.single('file'), roleMiddleware(['admin', 'manager', 'director']), validateCreateSubTask, TaskController.createSubTask.bind(TaskController));
router.patch('/:taskId/subtasks/:subTaskId/submit', upload.single('file'), validateSubmitTask, TaskController.submitTask.bind(TaskController));

module.exports = router;