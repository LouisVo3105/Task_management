const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const indicatorSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

indicatorSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Indicator', indicatorSchema);