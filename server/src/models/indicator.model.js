const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const indicatorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  endDate: { type: Date, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

indicatorSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Indicator', indicatorSchema);