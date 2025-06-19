`use strict`

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  objective: { type: String, required: true },
  assignedUnit: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  quantitativeTarget: { type: Number },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  actualResult: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'rejected'], 
    default: 'pending' 
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  field: { type: String },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  isParent: { type: Boolean, default: false },
  guideline: { type: String, default: null }, // Lưu base64 (VD: data:application/pdf;base64,...)
  report: { type: String, default: null },   // Lưu base64
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Tạo index để tối ưu truy vấn
taskSchema.index({ parentTask: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);