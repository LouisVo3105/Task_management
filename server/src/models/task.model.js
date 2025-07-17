const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Schema cho lịch sử duyệt
const approvalHistorySchema = new mongoose.Schema({
  action: { 
    type: String, 
    enum: ['approve', 'reject'], 
    required: true 
  },
  comment: { type: String, required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedAt: { type: Date, default: Date.now }
}, { _id: true });

// Schema cho submission với thông tin duyệt
const submissionSchema = new mongoose.Schema({
  file: { type: String, required: true },
  fileName: { type: String },
  link: { type: String },
  note: { type: String },
  submittedAt: { type: Date, default: Date.now },
  // Thông tin duyệt cho submission này
  approvalStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvalComment: { type: String }, // Lý do từ chối hoặc nhận xét khi duyệt
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { _id: true });

const subTaskSchema = new mongoose.Schema({
  
  title: { type: String, required: true },
  content: { type: String, required: true },
  endDate: { type: Date, required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Chủ trì của subtask
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'approved', 'overdue'], 
    default: 'pending' 
  },
  file: { type: String },
  fileName: { type: String },
  submitNote: { type: String },
  submitLink: { type: String },
  submissions: [submissionSchema],
  approvalHistory: [approvalHistorySchema],
  overdueNotified: { type: Boolean, default: false }
}, { _id: true, timestamps: true });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  endDate: { type: Date, required: true },
  indicator: { type: mongoose.Schema.Types.ObjectId, ref: 'Indicator', required: true },
  indicatorCreator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'approved', 'overdue'], 
    default: 'pending' 
  },
  file: { type: String },
  fileName: { type: String },
  submitNote: { type: String },
  submitLink: { type: String },
  subTasks: [subTaskSchema],
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  submissions: [submissionSchema],
  approvalHistory: [approvalHistorySchema],
  overdueNotified: { type: Boolean, default: false }
}, { timestamps: { createdAt: true, updatedAt: false } });

taskSchema.index({ indicator: 1 });
taskSchema.index({ leader: 1, status: 1 });
taskSchema.index({ 'subTasks.status': 1, leader: 1 });
taskSchema.index({ department: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ endDate: 1 });
taskSchema.index({ code: 1 }, { unique: true });
taskSchema.index({ 'subTasks.assignee': 1 });
taskSchema.index({ 'subTasks.status': 1 });
taskSchema.index({ 'subTasks.endDate': 1 });
taskSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Task', taskSchema);