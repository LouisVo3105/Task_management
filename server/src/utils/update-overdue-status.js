const mongoose = require('mongoose');
const Task = require('../models/task.model');

async function updateOverdueStatus() {
  try {
    console.log('🔄 Bắt đầu cập nhật trạng thái quá deadline...');
    
    const now = new Date();
    
    // Cập nhật nhiệm vụ chính quá deadline
    const mainTaskResult = await Task.updateMany(
      {
        status: { $in: ['pending', 'submitted'] },
        endDate: { $lt: now }
      },
      {
        $set: { status: 'overdue' }
      }
    );
    
    console.log(`✅ Đã cập nhật ${mainTaskResult.modifiedCount} nhiệm vụ chính thành trạng thái quá deadline`);

    // Cập nhật nhiệm vụ con quá deadline
    const subTaskResult = await Task.updateMany(
      {
        'subTasks.status': { $in: ['pending', 'submitted'] },
        'subTasks.endDate': { $lt: now }
      },
      {
        $set: { 'subTasks.$.status': 'overdue' }
      }
    );
    
    console.log(`✅ Đã cập nhật ${subTaskResult.modifiedCount} nhiệm vụ con thành trạng thái quá deadline`);
    
    console.log('🎉 Hoàn thành cập nhật trạng thái quá deadline!');
    
  } catch (error) {
    console.error('❌ Lỗi trong quá trình cập nhật trạng thái quá deadline:', error);
    throw error;
  }
}

// Nếu chạy trực tiếp file này
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/task_management';
  
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅ Đã kết nối database');
      return updateOverdueStatus();
    })
    .then(() => {
      console.log('✅ Hoàn thành!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Lỗi:', error);
      process.exit(1);
    })
    .finally(() => {
      mongoose.disconnect();
    });
}

module.exports = updateOverdueStatus; 