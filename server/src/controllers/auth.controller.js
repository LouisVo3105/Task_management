"use strict";

const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { tokenBlacklist } = require('../middlewares/auth.middleware');
const authService = require('../services/auth.service');
const { sendIncompleteTasksCount, sendPendingApprovalTasksCount } = require('../services/sse.service');


class AuthController {
  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
      if (result && result.user && result.user._id) {
        sendIncompleteTasksCount(result.user._id);
        sendPendingApprovalTasksCount(result.user._id);
      }
    } catch (error) {
      const status = error.status || 401;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      authService.logout(token);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      const status = error.status || 401;
      res.status(status).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();