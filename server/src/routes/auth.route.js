const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const {verifyRefreshToken} = require('../middlewares/auth.middleware')

// Đăng nhập
router.post('/login', AuthController.login);

// Đăng xuất
router.post('/logout', AuthController.logout);

// Làm mới token
router.post('/refresh-token', verifyRefreshToken, AuthController.refreshToken);

module.exports = router;