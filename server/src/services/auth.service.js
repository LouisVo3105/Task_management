"use strict";
const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { tokenBlacklist } = require('../middlewares/auth.middleware');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

async function login({ username, password }) {
  const user = await User.findOne({ username }).select('password isActive role department').lean();
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid credentials');
  }
  if (!user.isActive) {
    const err = new Error('Account is deactivated');
    err.status = 403;
    throw err;
  }
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, department: user.department },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
  return {
    accessToken,
    refreshToken,
    id: user._id,
    role: user.role
  };
}

function logout(token) {
  if (!token) throw new Error('No token provided');
  tokenBlacklist.add(token);
  return true;
}

async function refreshToken(refreshToken) {
  if (!refreshToken) throw new Error('Refresh token is required');
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
  } catch (err) {
    const error = new Error('Invalid refresh token');
    error.status = 401;
    throw error;
  }
  const user = await User.findById(decoded.id).select('role department').lean();
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  const newAccessToken = jwt.sign(
    { id: user._id, role: user.role, department: user.department },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { accessToken: newAccessToken };
}

module.exports = { login, logout, refreshToken }; 