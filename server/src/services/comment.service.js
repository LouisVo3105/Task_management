"use strict";
const Comment = require('../models/comment.model');
const User = require('../models/user.model');
const Indicator = require('../models/indicator.model');

const getCommentsByIndicator = async (indicatorId) => {
  return await Comment.find({ indicatorId })
    .populate('authorId', 'fullName email')
    .sort({ createdAt: 1 });
};

const createComment = async ({ indicatorId, parentId, content, authorId }) => {
  if (!content || !indicatorId) {
    const err = new Error('Thiếu nội dung hoặc indicatorId');
    err.status = 400;
    throw err;
  }
  const indicator = await Indicator.findById(indicatorId);
  if (!indicator) {
    const err = new Error('Không tìm thấy chỉ tiêu');
    err.status = 404;
    throw err;
  }
  const comment = new Comment({
    indicatorId,
    parentId: parentId || null,
    content,
    authorId
  });
  await comment.save();
  await comment.populate('authorId', 'fullName email');
  return comment;
};

const deleteCommentAndChildren = async (commentId) => {
  const children = await Comment.find({ parentId: commentId });
  for (const child of children) {
    await deleteCommentAndChildren(child._id);
  }
  await Comment.deleteOne({ _id: commentId });
};

const deleteComment = async (commentId, user) => {
  const comment = await Comment.findById(commentId).populate('authorId', 'role position');
  if (!comment) {
    const err = new Error('Không tìm thấy comment');
    err.status = 404;
    throw err;
  }
  // Quyền xóa: user chỉ xóa được comment của mình
  if (comment.authorId._id.toString() === user.id) {
    await deleteCommentAndChildren(comment._id);
    return;
  }
  // Admin hoặc Giam doc xóa được tất cả
  if (user.role === 'admin' || user.position === 'Giam doc') {
    // Nếu là Pho Giam doc thì không được xóa comment của Giam doc
    if (user.position === 'Pho Giam doc' && comment.authorId.position === 'Giam doc') {
      const err = new Error('Pho Giam doc không thể xóa comment của Giam doc');
      err.status = 403;
      throw err;
    }
    await deleteCommentAndChildren(comment._id);
    return;
  }
  // Pho Giam doc chỉ xóa được comment của mình hoặc của người khác không phải Giam doc
  if (user.position === 'Pho Giam doc') {
    if (comment.authorId.position === 'Giam doc') {
      const err = new Error('Pho Giam doc không thể xóa comment của Giam doc');
      err.status = 403;
      throw err;
    }
    await deleteCommentAndChildren(comment._id);
    return;
  }
  // Không đủ quyền
  const err = new Error('Bạn không có quyền xóa comment này');
  err.status = 403;
  throw err;
};

module.exports = {
  getCommentsByIndicator,
  createComment,
  deleteComment,
}; 