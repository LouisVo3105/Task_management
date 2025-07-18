"use strict";
const commentService = require('../services/comment.service');
const { sendSseToastToUser } = require('../services/sse.service');

class CommentController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async getCommentsByIndicator(req, res) {
    try {
      const { indicatorId } = req.params;
      const comments = await commentService.getCommentsByIndicator(indicatorId);
      this.#sendResponse(res, 200, true, 'Lấy danh sách comment thành công', comments);
    } catch (error) {
      this.#sendResponse(res, error.status || 500, false, 'Lỗi khi lấy comment', null, error.message);
    }
  }

  async createComment(req, res) {
    try {
      const { indicatorId, parentId, content } = req.body;
      const authorId = req.user.id;
      const comment = await commentService.createComment({ indicatorId, parentId, content, authorId });
      this.#sendResponse(res, 201, true, 'Tạo comment thành công', comment);
      sendSseToastToUser(authorId, 'success', 'Tạo comment thành công!');
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi tạo comment');
      this.#sendResponse(res, error.status || 500, false, 'Lỗi khi tạo comment', null, error.message);
    }
  }

  async deleteComment(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      await commentService.deleteComment(id, user);
      this.#sendResponse(res, 200, true, 'Xóa comment thành công');
      sendSseToastToUser(user.id, 'success', 'Xóa comment thành công!');
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi xóa comment');
      this.#sendResponse(res, error.status || 500, false, 'Lỗi khi xóa comment', null, error.message);
    }
  }
}

module.exports = new CommentController(); 