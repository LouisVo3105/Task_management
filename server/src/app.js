"use strict";
require('dotenv').config();
const cors = require('cors');
const express = require('express');
const app = express();
const morgan = require('morgan');
const { default: helmet } = require('helmet');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const Task = require('./models/task.model');
const Indicator = require('./models/indicator.model');
const { registerSSE } = require('./services/sse.service');
const lastNotified = {}; // { [userId_taskType_taskId]: lastNotifyDate }
const JWT_SECRET = process.env.JWT_SECRET;
const { updateOverdueStatus } = require('./middlewares/task.middleware');
const rateLimit = require('express-rate-limit');

const userRoute = require('./routes/user.route');
const taskRoute = require('./routes/task.route');
const authRoute = require('./routes/auth.route');
const indicatorRoute = require('./routes/indicator.route');
const analysisRoute = require('./routes/analysis.route');
const departmentRoute = require('./routes/department.route');
const commentRoute = require('./routes/comment.route');
const notificationRoute = require('./routes/notification.route');
const Database = require('./dbs/database');

const CLIENT_URL = process.env.CLIENT;

const db = Database.getInstance();

app.use(cors({
  origin:[CLIENT_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.set('trust proxy', 1)

// Middleware
app.use(morgan('dev'));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Kết nối database
db.connect().catch(err => console.error('Failed to connect to DB:', err));

// Cấu hình rate limit cho toàn bộ API
const userLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 50,
  message: 'Quá nhiều request user, vui lòng thử lại sau!'
});

const taskIndicatorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 200,
  message: 'Quá nhiều request task/indicator, vui lòng thử lại sau!'
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 60,
  message: 'Quá nhiều request comment, vui lòng thử lại sau!'
});

// Khởi tạo routes
app.use('/api/auth', userLimiter, authRoute);
app.use('/api/users', userLimiter, userRoute);
app.use('/api/tasks', taskIndicatorLimiter, taskRoute);
app.use('/api/indicators', taskIndicatorLimiter, indicatorRoute);
app.use('/api/analysis', analysisRoute);
app.use('/api/departments', departmentRoute);
app.use('/api/comments', commentLimiter, commentRoute);
app.use('/api/notifications', notificationRoute);

// Đăng ký SSE
registerSSE(app);

// Tự động kiểm tra nhiệm vụ quá deadline mỗi giờ
setInterval(() => {
  updateOverdueStatus({}, { }, () => {
    console.log(`[OverdueCheck] Đã kiểm tra và cập nhật trạng thái quá deadline cho nhiệm vụ lúc ${new Date().toISOString()}`);
  });
}, 60 * 60 * 1000); // mỗi giờ

// Xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Xử lý lỗi đặc biệt
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      type: 'ValidationError',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  res.status(500).json({ 
    type: 'ServerError', 
    message: 'Internal server error' 
  });
});

module.exports = app;