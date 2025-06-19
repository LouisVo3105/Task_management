const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

// Đăng nhập
router.post('/login', AuthController.login);

// Đăng xuất
router.post('/logout', AuthController.logout);

// Làm mới token
router.post('/refresh-token', AuthController.refreshToken);

module.exports = router;