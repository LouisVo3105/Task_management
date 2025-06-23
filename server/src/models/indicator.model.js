const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const indicatorSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['KHCN', 'ĐMST', 'CĐS'], required: true },
  unit: { type: String, required: true },
  department: { type: String, required: true },
  notes: String,
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true }); // Thêm timestamps

indicatorSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Indicator', indicatorSchema);