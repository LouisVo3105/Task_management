"use strict";
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { INDICATOR_STATUS } = require('../configs/enum');

const indicatorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  endDate: { type: Date, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: INDICATOR_STATUS, 
    default: 'active' 
  },
  isOverdue: { type: Boolean, default: false }
});

indicatorSchema.plugin(mongoosePaginate);
indicatorSchema.index({ creator: 1 });

module.exports = mongoose.model('Indicator', indicatorSchema);