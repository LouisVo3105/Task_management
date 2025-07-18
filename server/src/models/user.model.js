"use strict";
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { ROLES, POSITIONS, GENDERS } = require('../configs/enum');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  fullName: { type: String, required: true },
  gender: { type: String, enum: GENDERS, required: true },
  position: { type: String, enum: POSITIONS, required: true },
  phoneNumber: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  role: { type: String, enum: ROLES, default: 'user' },
  directSupervisor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: function() { return ROLES.filter(r => r !== 'admin').includes(this.role); } // Bắt buộc với user và manager
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Thêm index cho các trường tìm kiếm thường xuyên
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ fullName: 1 });
userSchema.index({ directSupervisor: 1 });

userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', userSchema);