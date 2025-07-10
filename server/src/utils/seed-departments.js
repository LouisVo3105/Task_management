const mongoose = require('mongoose');
const Department = require('../models/department.model');

const departments = [
  { name: 'Phòng Kế hoạch', description: 'Phụ trách lập kế hoạch, tổng hợp' },
  { name: 'Phòng Nhân sự', description: 'Quản lý nhân sự, tuyển dụng, đào tạo' },
  { name: 'Phòng Tài chính', description: 'Quản lý tài chính, kế toán' },
  { name: 'Phòng Kỹ thuật', description: 'Phụ trách kỹ thuật, công nghệ' },
  { name: 'Phòng Kinh doanh', description: 'Phụ trách kinh doanh, bán hàng' },
  { name: 'Phòng Hành Chính', description: 'Phụ trách hành chính' }
];

async function seedDepartments() {
  try {
    console.log('🔄 Đang seed dữ liệu phòng ban...');
    for (const dept of departments) {
      const exists = await Department.findOne({ name: dept.name });
      if (!exists) {
        await Department.create(dept);
        console.log(`✅ Đã thêm phòng ban: ${dept.name}`);
      } else {
        console.log(`⚠️  Phòng ban đã tồn tại: ${dept.name}`);
      }
    }
    console.log('🎉 Seed phòng ban hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi seed phòng ban:', error);
  }
}

module.exports = seedDepartments; 