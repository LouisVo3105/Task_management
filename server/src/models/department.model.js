"use strict";
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String }
}, { timestamps: true });

departmentSchema.index({ name: 1 });

module.exports = mongoose.model('Department', departmentSchema); 