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
const { broadcastSSE, sendSseToastToUser } = require('../services/sse.service');
const userService = require('../services/user.service');

class UserController {
  #sendResponse(res, status, success, message, data = null, errors = null) {
    return res.status(status).json({ success, message, data, errors });
  }

  async createUser(req, res) {
    try {
      const userResponse = await userService.createUser(req.body, req.user);
      this.#sendResponse(res, 201, true, 'Người dùng đã được tạo thành công', userResponse);
      sendSseToastToUser(req.user.id, 'success', 'Tạo người dùng thành công!');
      broadcastSSE('user_created', { userId: userResponse._id, user: userResponse });
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi tạo người dùng');
      this.#sendResponse(res, 400, false, error.message);
    }
  }

  async getUserProfile(req, res) {
    try {
      const user = await userService.getUserProfile(req.user.id);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await userService.getAllUsers(req.query, req.user);
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateUser(req, res) {
    try {
      const updatedUser = await userService.updateUser(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'User updated successfully', data: updatedUser });
      sendSseToastToUser(req.user.id, 'success', 'Cập nhật người dùng thành công!');
      broadcastSSE('user_updated', { userId: updatedUser._id, user: updatedUser.toObject ? updatedUser.toObject() : updatedUser });
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi cập nhật người dùng');
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const deletedUser = await userService.deleteUser(req.params.id, req.user);
      res.json({ success: true, message: 'User deactivated successfully', data: deletedUser });
      sendSseToastToUser(req.user.id, 'success', 'Xóa người dùng thành công!');
      broadcastSSE('user_deleted', { userId: deletedUser._id });
    } catch (error) {
      sendSseToastToUser(req.user.id, 'error', error.message || 'Lỗi khi xóa người dùng');
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getSubordinates(req, res) {
    try {
      const subordinates = await userService.getSubordinates(req.user);
      this.#sendResponse(res, 200, true, 'Lấy danh sách cấp dưới thành công', subordinates);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách cấp dưới', null, error.message);
    }
  }

  async deleteUserPermanently(req, res) {
    try {
      await userService.deleteUserPermanently(req.params.id);
      res.json({ success: true, message: 'User permanently deleted.' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async importUsersFromCSV(req, res) {
    try {
      const result = await userService.importUsersFromCSV(req.file, req.user);
      this.#sendResponse(res, 200, true, `Đã import ${result.success} user, lỗi: ${result.errors.length}`, result);
    } catch (error) {
      this.#sendResponse(res, 400, false, error.message);
    }
  }

  async exportUsers(req, res) {
    try {
      const result = await userService.exportUsers(req.query);
      if (result.type === 'xlsx') {
        res.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.end(result.buffer);
      } else {
        res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
        res.setHeader('Content-Type', 'text/csv');
        return res.end(result.csv);
      }
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async getPositions(req, res) {
    try {
      const data = userService.getPositions();
      this.#sendResponse(res, 200, true, 'Lấy danh sách position thành công', data);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách position', null, error.message);
    }
  }

  async getLeaders(req, res) {
    try {
      const users = await userService.getLeaders();
      this.#sendResponse(res, 200, true, 'Lấy danh sách lãnh đạo thành công', users);
    } catch (error) {
      this.#sendResponse(res, 500, false, 'Lỗi khi lấy danh sách lãnh đạo', null, error.message);
    }
  }
}

module.exports = new UserController();