const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/task.controller');
const {authMiddleware} = require('../middlewares/auth.middleware');
const { validateTask, validateSubTask, validateSubmit } = require('../middlewares/task.validation');

router.use(authMiddleware);

router.post('/', validateTask, (req, res) => TaskController.createTask(req, res));
router.put('/:taskId', validateTask, (req, res) => TaskController.updateTask(req, res));
router.delete('/:taskId', (req, res) => TaskController.deleteTask(req, res));
router.patch('/:taskId/submit', validateSubmit, (req, res) => TaskController.submitMainTask(req, res));
router.patch('/:taskId/subtasks/:subTaskId/submit', validateSubmit, (req, res) => TaskController.submitSubTask(req, res));
router.patch('/:taskId/review', (req, res) => TaskController.reviewTask(req, res));
router.patch('/:taskId/subtasks/:subTaskId/review', (req, res) => TaskController.reviewTask(req, res));
router.get('/', (req, res) => TaskController.getTasks(req, res));
router.get('/:id', (req, res) => TaskController.getTaskDetail(req, res));
router.post('/:taskId/subtasks', validateSubTask, (req, res) => TaskController.addSubTask(req, res));
router.put('/:taskId/subtasks/:subTaskId', validateSubTask, (req, res) => TaskController.updateSubTask(req, res));
router.delete('/:taskId/subtasks/:subTaskId', (req, res) => TaskController.deleteSubTask(req, res));

module.exports = router;