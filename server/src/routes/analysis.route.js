const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware, roleMiddleware(['admin', 'manager']));

router.get('/overall-stats', analysisController.getOverallStats.bind(analysisController));
router.get('/user-performance', analysisController.getUserPerformance.bind(analysisController));
router.get('/indicator-progress', analysisController.getIndicatorProgress.bind(analysisController));
router.get('/department-progress', analysisController.getDepartmentProgress.bind(analysisController));
router.get('/department-task-summary', authMiddleware, analysisController.getDepartmentTaskSummary.bind(analysisController));

module.exports = router;
