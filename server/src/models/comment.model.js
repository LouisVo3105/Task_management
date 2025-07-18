"use strict";
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  indicatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Indicator', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  content: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema); 