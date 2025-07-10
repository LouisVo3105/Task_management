const User = require('../models/user.model');
const Department = require('../models/department.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const xlsx = require('xlsx');
const { Parser: CsvParser } = require('json2csv');
const { mapPosition, getStandardPositions, getPositionKeywords } = require('../utils/position-mapper');

class UserController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createUser(req, res) {
    try {
      const { username, password, directSupervisor, ...userData } = req.body;
      const currentUser = req.user;
      

      if (currentUser.role === 'user') {
        return this.#sendResponse(res, 403, false, 'Không có quyền tạo người dùng');
      }
      

      if (currentUser.role === 'manager' && userData.department !== currentUser.department) {
        return this.#sendResponse(res, 403, false, 'Chỉ được tạo người dùng trong cùng phòng ban');
      }

      const existingUser = await User.findOne({ 
        $or: [{ username }, { email: userData.email }] 
      });
      
      if (existingUser) {
        return this.#sendResponse(res, 409, false, 'Tên đăng nhập hoặc email đã tồn tại');
      }
      

      if (['user', 'manager'].includes(userData.role)) {
        const supervisor = await User.findById(directSupervisor);
        if (!supervisor || !supervisor.isActive) {
          return this.#sendResponse(res, 400, false, 'Cấp trên không tồn tại hoặc không hoạt động');
        }
      }
      
      // Mapping position từ input thành position chuẩn
      if (userData.position) {
        userData.position = mapPosition(userData.position);
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = new User({
        username,
        password: hashedPassword,
        directSupervisor,
        ...userData,
        createdBy: currentUser.id
      });
      
      await user.save();

      const userResponse = user.toObject();
      delete userResponse.password;
      
      this.#sendResponse(res, 201, true, 'Người dùng đã được tạo thành công', userResponse);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi tạo người dùng', null, error.message);
    }
  }

  async getUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId)
        .select('-password')
        .populate('directSupervisor', 'fullName position')
        .populate('department', 'name description');
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      res.json({ 
        success: true, 
        data: user 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: error.message 
      });
    }
  }

  async getAllUsers(req, res) {
    try {
      const { department, role, search, includeInactive } = req.query;
      const filter = {};
      if (!includeInactive) filter.isActive = true;
      if (req.user.role === 'manager') {
        filter.department = req.user.department;
      }
      if (department) filter.department = department;
      if (role) filter.role = role;
      if (search) {
        filter.$or = [
          { fullName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ];
      }
      let users = await User.find(filter, '-password')
        .populate('directSupervisor', 'fullName position')
        .populate('department', 'name description')
        .lean();

      const currentUserId = req.user.id;
      const isCurrentUserInList = users.some(u => u._id.toString() === currentUserId);
      if (!isCurrentUserInList) {
        const currentUser = await User.findOne({ _id: currentUserId })
          .select('-password')
          .populate('directSupervisor', 'fullName position')
          .populate('department', 'name description')
          .lean();
        if (currentUser) {
          users.push(currentUser);
        }
      }
      res.json({ success: true, data: users });   
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: error.message 
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const currentUser = req.user;
      
      if (currentUser.role === 'user' && currentUser.id !== id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied' 
        });
      }
      
      if (currentUser.role === 'manager') {
        const userToUpdate = await User.findById(id);
        if (userToUpdate.department !== currentUser.department) {
          return res.status(403).json({ 
            success: false, 
            message: 'Can only update users in your department' 
          });
        }
      }
      
      if (updateData.username) {
        delete updateData.username;
      }
      
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }
      
      // Mapping position từ input thành position chuẩn
      if (updateData.position) {
        updateData.position = mapPosition(updateData.position);
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        id, 
        { ...updateData, updatedAt: Date.now() },
        { new: true, runValidators: true }
      ).select('-password')
       .populate('directSupervisor', 'fullName position')
       .populate('department', 'name description');
      
      if (!updatedUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'User updated successfully',
        data: updatedUser 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error updating user',
        error: error.message 
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      
      if (currentUser.id === id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete yourself' 
        });
      }
      
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied' 
        });
      }
      
      const deletedUser = await User.findByIdAndUpdate(
        id, 
        { isActive: false },
        { new: true }
      ).select('-password');
      
      if (!deletedUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'User deactivated successfully',
        data: deletedUser 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error deactivating user',
        error: error.message 
      });
    }
  }

  async getSubordinates(req, res) {
    try {
      const currentUser = req.user;
      let subordinates;

      if (currentUser.role === 'admin') {
        subordinates = await User.find({ isActive: true })
          .select('_id fullName role department')
          .lean();
      } else {
        subordinates = await User.find({ 
          directSupervisor: currentUser.id,
          isActive: true 
        }).select('_id fullName role department') 
          .lean();
      }

      this.#sendResponse(res, 200, true, 'Lấy danh sách cấp dưới thành công', subordinates);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách cấp dưới', null, error.message);
    }
  }

  async deleteUserPermanently(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (user.isActive) {
        return res.status(400).json({ success: false, message: 'User must be deactivated (isActive: false) before permanent deletion.' });
      }
      await User.deleteOne({ _id: id });
      res.json({ success: true, message: 'User permanently deleted.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting user permanently', error: error.message });
    }
  }

  async importUsersFromCSV(req, res) {
    if (!req.file) {
      return this.#sendResponse(res, 400, false, 'Không có file được upload');
    }
    const results = [];
    const errors = [];
    const filePath = req.file.path;
    const currentUser = req.user;
    const baseFields = ['username','password','email','fullName','position','phoneNumber','department','role'];
    const ext = filePath.split('.').pop().toLowerCase();
    let rows = [];
    try {
      if (ext === 'xlsx') {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      } else {
        const csvRows = await new Promise((resolve, reject) => {
          const arr = [];
          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => arr.push(row))
            .on('end', () => resolve(arr))
            .on('error', reject);
        });
        rows = csvRows;
      }
    } catch (e) {
      fs.unlinkSync(filePath);
      return this.#sendResponse(res, 400, false, 'Lỗi đọc file: ' + e.message);
    }
    for (const row of rows) {
      const missing = baseFields.filter(f => !row[f] || row[f].toString().trim() === '');
      if (missing.length > 0) {
        errors.push({ row, error: `Thiếu trường: ${missing.join(', ')}` });
        continue;
      }
      if ((row.role === 'user' || row.role === 'manager') && (!row.directSupervisor || row.directSupervisor.toString().trim() === '')) {
        errors.push({ row, error: 'Thiếu directSupervisor cho user/manager' });
        continue;
      }
      if (!['admin','manager','user'].includes(row.role)) {
        errors.push({ row, error: 'Vai trò không hợp lệ' });
        continue;
      }
      results.push(row);
    }
    let success = 0;
    for (const userData of results) {
      try { 
        // Map tên department sang ObjectId nếu cần
        if (userData.department && !/^[0-9a-fA-F]{24}$/.test(userData.department)) {
          const dept = await Department.findOne({ name: userData.department.trim() });
          if (!dept) {
            errors.push({ row: userData, error: `Phòng ban "${userData.department}" không tồn tại` });
            continue;
          }
          userData.department = dept._id;
        }

        const existingUser = await User.findOne({ $or: [{ username: userData.username }, { email: userData.email }] });
        if (existingUser) {
          errors.push({ row: userData, error: 'Username hoặc email đã tồn tại' });
          continue;
        }
        if (['user','manager'].includes(userData.role)) {
          const supervisor = await User.findById(userData.directSupervisor);
          if (!supervisor || !supervisor.isActive) {
            errors.push({ row: userData, error: 'Supervisor không tồn tại hoặc không hoạt động' });
            continue;
          }
        }
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          ...userData,
          password: hashedPassword,
          createdBy: currentUser.id
        });
        await user.save();
        success++;
      } catch (err) {
        errors.push({ row: userData, error: err.message });
      }
    }
    fs.unlinkSync(filePath);
    this.#sendResponse(res, 200, true, `Đã import ${success} user, lỗi: ${errors.length}`, { success, errors });
  }

  async exportUsers(req, res) {
    try {
      const type = (req.query.type || 'csv').toLowerCase();
      const users = await User.find({}, '-password -__v')
        .populate('department', 'name')
        .populate('directSupervisor', 'fullName')
        .lean();
      if (!users || users.length === 0) {
        return res.status(404).json({ success: false, message: 'Không có dữ liệu người dùng' });
      }
      // Chuyển đổi dữ liệu cho export
      const exportData = users.map(u => ({
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        position: u.position,
        phoneNumber: u.phoneNumber,
        department: u.department?.name || '', // Xuất tên phòng ban
        role: u.role,
        directSupervisor: u.directSupervisor ? (u.directSupervisor.fullName || u.directSupervisor) : '',
        isActive: u.isActive,
        createdAt: u.createdAt,
      }));
      if (type === 'xlsx') {
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(exportData);
        xlsx.utils.book_append_sheet(wb, ws, 'Users');
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.end(buffer);
      } else {
        // Mặc định là CSV
        const csvParser = new CsvParser({ header: true });
        const csv = csvParser.parse(exportData);
        res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
        res.setHeader('Content-Type', 'text/csv');
        return res.end(csv);
      }
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi export user', error: error.message });
    }
  }

  async getPositions(req, res) {
    try {
      const standardPositions = getStandardPositions();
      const positionKeywords = getPositionKeywords();
      
      this.#sendResponse(res, 200, true, 'Lấy danh sách position thành công', {
        positions: standardPositions,
        keywords: positionKeywords
      });
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách position', null, error.message);
    }
  }
}

module.exports = new UserController();