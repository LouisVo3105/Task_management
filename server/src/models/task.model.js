const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const subTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  report: String,
  feedback: String, // Thêm trường feedback
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'rejected'], 
    default: 'pending' 
  },
}, { _id: true });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  indicator: { type: mongoose.Schema.Types.ObjectId, ref: 'Indicator', required: true },
  assigner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  report: String,
  feedback: String, // Thêm trường feedback
  notes: String,
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'rejected'], 
    default: 'pending' 
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  subTasks: [subTaskSchema],
}, { 
  timestamps: true,
  versionKey: 'version'
});

// Indexes
taskSchema.index({ indicator: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 }); // Thêm index cho sort theo createdAt

taskSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Task', taskSchema);