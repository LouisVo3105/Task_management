const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const subTaskSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  endDate: { type: Date, required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'approved'], 
    default: 'pending' 
  },
  submitNote: { type: String }, // Thêm trường ghi chú khi nộp
  submitLink: { type: String }  // Thêm trường link báo cáo
}, { _id: true });

const taskSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  endDate: { type: Date, required: true },
  indicator: { type: mongoose.Schema.Types.ObjectId, ref: 'Indicator', required: true },
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'approved'], 
    default: 'pending' 
  },
  submitNote: { type: String }, // Thêm trường ghi chú khi nộp
  submitLink: { type: String }, // Thêm trường link báo cáo
  subTasks: [subTaskSchema],
  assigner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }]
}, { timestamps: { createdAt: true, updatedAt: false } });

taskSchema.index({ indicator: 1 });
taskSchema.index({ assigner: 1, status: 1 });
taskSchema.index({ 'subTasks.status': 1, assigner: 1 });
taskSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Task', taskSchema);