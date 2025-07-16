const Comment = require('../models/comment.model');
const User = require('../models/user.model');
const Indicator = require('../models/indicator.model');

class CommentController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  // Lấy tất cả comment theo indicatorId
  async getCommentsByIndicator(req, res) {
    try {
      const { indicatorId } = req.params;
      const comments = await Comment.find({ indicatorId })
        .populate('authorId', 'fullName email')
        .sort({ createdAt: 1 });
      this.#sendResponse(res, 200, true, 'Lấy danh sách comment thành công', comments);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy comment', null, error.message);
    }
  }

  // Tạo comment mới
  async createComment(req, res) {
    try {
      const { indicatorId, parentId, content } = req.body;
      const authorId = req.user.id;
      console.log('[CREATE COMMENT]', {
        user: req.user,
        indicatorId,
        parentId,
        content
      });
      if (!content || !indicatorId) {
        return this.#sendResponse(res, 400, false, 'Thiếu nội dung hoặc indicatorId');
      }
      const indicator = await Indicator.findById(indicatorId);
      if (!indicator) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy chỉ tiêu');
      }
      const comment = new Comment({
        indicatorId,
        parentId: parentId || null,
        content,
        authorId
      });
      await comment.save();
      await comment.populate('authorId', 'fullName email');
      this.#sendResponse(res, 201, true, 'Tạo comment thành công', comment);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo comment', null, error.message);
    }
  }

  // Hàm xóa đệ quy comment và các comment con
  async deleteCommentAndChildren(commentId) {
    const children = await Comment.find({ parentId: commentId });
    for (const child of children) {
      await this.deleteCommentAndChildren(child._id);
    }
    await Comment.deleteOne({ _id: commentId });
  }

  // Xóa comment
  async deleteComment(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const comment = await Comment.findById(id).populate('authorId', 'role position');
      if (!comment) {
        return this.#sendResponse(res, 404, false, 'Không tìm thấy comment');
      }
      // Quyền xóa: user chỉ xóa được comment của mình
      if (comment.authorId._id.toString() === user.id) {
        await this.deleteCommentAndChildren(comment._id);
        return this.#sendResponse(res, 200, true, 'Xóa comment thành công');
      }
      // Admin hoặc Giam doc xóa được tất cả
      if (user.role === 'admin' || user.position === 'Giam doc') {
        // Nếu là Pho Giam doc thì không được xóa comment của Giam doc
        if (user.position === 'Pho Giam doc' && comment.authorId.position === 'Giam doc') {
          return this.#sendResponse(res, 403, false, 'Pho Giam doc không thể xóa comment của Giam doc');
        }
        await this.deleteCommentAndChildren(comment._id);
        return this.#sendResponse(res, 200, true, 'Xóa comment thành công');
      }
      // Pho Giam doc chỉ xóa được comment của mình hoặc của người khác không phải Giam doc
      if (user.position === 'Pho Giam doc') {
        if (comment.authorId.position === 'Giam doc') {
          return this.#sendResponse(res, 403, false, 'Pho Giam doc không thể xóa comment của Giam doc');
        }
        await this.deleteCommentAndChildren(comment._id);
        return this.#sendResponse(res, 200, true, 'Xóa comment thành công');
      }
      // Không đủ quyền
      return this.#sendResponse(res, 403, false, 'Bạn không có quyền xóa comment này');
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi xóa comment', null, error.message);
    }
  }
}

module.exports = new CommentController(); 