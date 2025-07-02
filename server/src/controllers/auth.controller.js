`use strict`

const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { tokenBlacklist } = require('../middlewares/auth.middleware');



class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ 
          success: false, 
          message: 'Account is deactivated' 
        });
      }
      
      // Tạo access token
      const accessToken = jwt.sign(
        { 
          id: user._id, 
          role: user.role,
          department: user.department 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      
      // Tạo refresh token
      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
      );
      
      res.json({ 
        success: true, 
        data: {
          accessToken,
          refreshToken,
          id: user._id,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: error.message 
      });
    }
  }

  async logout(req, res) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      tokenBlacklist.add(token);
      
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error logging out' });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({ 
          success: false, 
          message: 'Refresh token is required' 
        });
      }
      
      // Xác thực refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Tạo access token mới
      const newAccessToken = jwt.sign(
        { 
          id: user._id, 
          role: user.role,
          department: user.department 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      
      res.json({ 
        success: true, 
        data: {
          accessToken: newAccessToken
        }
      });
    } catch (error) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid refresh token',
        error: error.message 
      });
    }
  }
}

module.exports = new AuthController();