const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

class UserController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createUser(req, res) {
    try {
      const { username, password, directSupervisor, ...userData } = req.body;
      const currentUser = req.user;
      
      // Phân quyền: Chỉ admin hoặc manager cùng phòng ban được tạo user
      if (currentUser.role === 'user') {
        return this.#sendResponse(res, 403, false, 'Không có quyền tạo người dùng');
      }
      
      // Manager chỉ được tạo user trong cùng phòng ban
      if (currentUser.role === 'manager' && userData.department !== currentUser.department) {
        return this.#sendResponse(res, 403, false, 'Chỉ được tạo người dùng trong cùng phòng ban');
      }
      
      // Kiểm tra username và email đã tồn tại
      const existingUser = await User.findOne({ 
        $or: [{ username }, { email: userData.email }] 
      });
      
      if (existingUser) {
        return this.#sendResponse(res, 409, false, 'Tên đăng nhập hoặc email đã tồn tại');
      }
      
      // Kiểm tra sự tồn tại của directSupervisor nếu cần
      if (['user', 'manager'].includes(userData.role)) {
        const supervisor = await User.findById(directSupervisor);
        if (!supervisor || !supervisor.isActive) {
          return this.#sendResponse(res, 400, false, 'Cấp trên không tồn tại hoặc không hoạt động');
        }
      }
      
      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = new User({
        username,
        password: hashedPassword,
        directSupervisor,
        ...userData,
        createdBy: currentUser.id
      });
      
      await user.save();
      
      // Trả về dữ liệu user không bao gồm mật khẩu
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
        .populate('directSupervisor', 'fullName position');
      
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
        .lean();
      // Đảm bảo user hiện tại luôn có trong danh sách
      const currentUserId = req.user.id;
      const isCurrentUserInList = users.some(u => u._id.toString() === currentUserId);
      if (!isCurrentUserInList) {
        const currentUser = await User.findOne({ _id: currentUserId })
          .select('-password')
          .populate('directSupervisor', 'fullName position')
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
      
      const updatedUser = await User.findByIdAndUpdate(
        id, 
        { ...updateData, updatedAt: Date.now() },
        { new: true, runValidators: true }
      ).select('-password');
      
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
}

module.exports = new UserController();