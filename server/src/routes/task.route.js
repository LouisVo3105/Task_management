const express = require('express');
const router = express.Router();
const { TaskController, validateCreateTask } = require('../controllers/task.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/create', authMiddleware, validateCreateTask, TaskController.createTask);
router.get('/list', authMiddleware, TaskController.getTaskList);
router.get('/:id', authMiddleware, TaskController.getTaskDetail);
router.put('/:id', authMiddleware, TaskController.updateTask);
router.put('/:id/approve', authMiddleware, TaskController.approveTask);
router.delete('/:id', authMiddleware, TaskController.deleteTask);

module.exports = router;