const Department = require('../models/department.model');
const User = require('../models/user.model');

class DepartmentController {
  async getDepartments(req, res) {
    try {
      const departments = await Department.find().select('_id name description');
      res.json({ success: true, data: departments });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi lấy danh sách phòng ban', error: error.message });
    }
  }

  async getLeaders(req, res) {
    try {
      const { id } = req.params;
      // 1. Lấy leader thuộc phòng ban (admin, Truong phong)
      const departmentLeaders = await User.find({
        department: id,
        isActive: true,
        $or: [
          { role: 'admin' },
          { position: 'Truong phong' }
        ]
      }).select('_id fullName email role position department');
  
      // 2. Lấy tất cả Giam doc và Pho Giam doc toàn hệ thống
      const directors = await User.find({
        isActive: true,
        position: { $in: ['Giam doc', 'Pho Giam doc'] }
      }).select('_id fullName email role position department');
  
      // 3. Gộp, loại trùng (nếu 1 người vừa là Truong phong vừa là Giam doc)
      const allLeadersMap = new Map();
      [...departmentLeaders, ...directors].forEach(user => {
        allLeadersMap.set(user._id.toString(), user);
      });
      const allLeaders = Array.from(allLeadersMap.values());
  
      res.json({ success: true, data: allLeaders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi lấy trưởng phòng', error: error.message });
    }
  }
  async getSupporters(req, res) {
    try {
      const { id } = req.params;
      // Lấy tất cả user thuộc phòng ban (không loại trừ manager)
      const supporters = await User.find({ department: id, isActive: true }).select('_id fullName email role position');
      res.json({ success: true, data: supporters });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi lấy nhân viên hỗ trợ', error: error.message });
    }
  }
}

module.exports = new DepartmentController(); 