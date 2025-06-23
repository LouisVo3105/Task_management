const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');


class UserController {
  async createUser(req, res) {
    try {
      const { username, password, ...userData } = req.body;
      const currentUser = req.user;
      
      // Phân quyền: Chỉ admin hoặc manager cùng phòng ban được tạo user
      if (currentUser.role === 'user') {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied' 
        });
      }
      
      // Manager chỉ được tạo user trong cùng phòng ban
      if (currentUser.role === 'manager' && 
          userData.department !== currentUser.department) {
        return res.status(403).json({ 
          success: false, 
          message: 'Can only create users in your department' 
        });
      }
      
      // Kiểm tra username và email đã tồn tại
      const existingUser = await User.findOne({ 
        $or: [{ username }, { email: userData.email }] 
      });
      
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          message: 'Username or email already exists' 
        });
      }
      
      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = new User({
        username,
        password: hashedPassword,
        ...userData,
        createdBy: currentUser.id
      });
      
      await user.save();
      
      // Trả về dữ liệu user không bao gồm mật khẩu
      const userResponse = user.toObject();
      delete userResponse.password;
      
      res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        data: userResponse
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Error creating user',
        error: error.message 
      });
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
      const { department, role, search } = req.query;
      const filter = { isActive: true };
  
      // Tối ưu hoá truy vấn
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
  
      // Sử dụng projection thay vì select()
      const users = await User.find(filter, '-password')
        .populate('directSupervisor', 'fullName position')
        .lean();
  
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
      
      // Chỉ admin/manager hoặc chính user mới được cập nhật
      if (currentUser.role === 'user' && currentUser.id !== id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied' 
        });
      }
      
      // Manager chỉ cập nhật user trong cùng phòng ban
      if (currentUser.role === 'manager') {
        const userToUpdate = await User.findById(id);
        if (userToUpdate.department !== currentUser.department) {
          return res.status(403).json({ 
            success: false, 
            message: 'Can only update users in your department' 
          });
        }
      }
      
      // Không cho phép cập nhật username
      if (updateData.username) {
        delete updateData.username;
      }
      
      // Nếu cập nhật mật khẩu
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
      
      // Không cho phép xóa chính mình
      if (currentUser.id === id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete yourself' 
        });
      }
      
      // Chỉ admin mới được xóa user
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Permission denied' 
        });
      }
      
      // Thực hiện "soft delete" bằng cách đánh dấu isActive = false
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
        // Admin xem tất cả user
        subordinates = await User.find({ isActive: true })
          .select('_id fullName role position department');
      } else {
        // Manager/user xem cấp dưới trực tiếp
        subordinates = await User.find({ 
          directSupervisor: currentUser.id,
          isActive: true 
        }).select('_id fullName role position department');
      }
      
      res.json({ 
        success: true, 
        data: subordinates 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: error.message 
      });
    }
  }

}

module.exports = new UserController();