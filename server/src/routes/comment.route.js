const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/comment.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Lấy tất cả comment theo indicatorId
router.get('/indicator/:indicatorId', CommentController.getCommentsByIndicator.bind(CommentController));

// Tạo comment mới
router.post('/', CommentController.createComment.bind(CommentController));

// Xóa comment
router.delete('/:id', CommentController.deleteComment.bind(CommentController));

module.exports = router; 