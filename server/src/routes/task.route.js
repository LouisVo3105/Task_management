const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/task.controller');
const { authMiddleware, roleMiddleware, canManageTask } = require('../middlewares/auth.middleware');
const { validateCreateTask, validateUpdateTask, validateSubmitTask } = require('../middlewares/task.validation');

router.use(authMiddleware);

router.post('/', roleMiddleware(['admin', 'manager']), validateCreateTask, TaskController.createTask.bind(TaskController));
router.put('/:id', roleMiddleware(['admin', 'manager']), canManageTask, validateUpdateTask, TaskController.updateTask.bind(TaskController));
router.delete('/:id', roleMiddleware(['admin', 'manager']), canManageTask, TaskController.deleteTask.bind(TaskController));
router.get('/:id/subtasks', TaskController.getSubTasks.bind(TaskController));
router.get('/:id', TaskController.getTaskDetail.bind(TaskController));
router.get('/pending/:assignerId', TaskController.getPendingTasks.bind(TaskController));
router.patch('/:id/submit', validateSubmitTask, TaskController.submitTask.bind(TaskController));
router.get('/incomplete/:userId', TaskController.getIncompleteTasks.bind(TaskController));
router.get('/completed/:userId', TaskController.getCompletedTasks.bind(TaskController));

module.exports = router;