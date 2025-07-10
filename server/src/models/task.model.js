const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const subTaskSchema = new mongoose.Schema({
  
  title: { type: String, required: true },
  content: { type: String, required: true },
  endDate: { type: Date, required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  submissions: [
    {
      file: { type: String, required: true },
      link: { type: String },
      note: { type: String },
      submittedAt: { type: Date, default: Date.now }
    }
  ]
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
  submissions: [
    {
      file: { type: String, required: true },
      link: { type: String },
      note: { type: String },
      submittedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: { createdAt: true, updatedAt: false } });

taskSchema.index({ indicator: 1 });
taskSchema.index({ leader: 1, status: 1 });
taskSchema.index({ 'subTasks.status': 1, leader: 1 });
taskSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Task', taskSchema);