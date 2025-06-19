const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  gender: { type: String, enum: ['Nam', 'Nữ', 'Khác'], required: true },
  position: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  department: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'user'], 
    default: 'user' 
  },
  directSupervisor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: function() { return this.role === 'user'; }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Thêm index cho các trường tìm kiếm thường xuyên
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', userSchema);