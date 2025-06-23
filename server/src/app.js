require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const { default: helmet } = require('helmet');
const compression = require('compression');
const userRoute = require('./routes/user.route');
const taskRoute = require('./routes/task.route');
const authRoute = require('./routes/auth.route');
const indicatorRoute = require('./routes/indicator.route'); // Thêm dòng này
const Database = require('./dbs/database');

const db = Database.getInstance();

// Middleware
app.use(morgan('dev'));
app.use(helmet());
app.use(compression());
app.use(express.json());

// Kết nối database
db.connect().catch(err => console.error('Failed to connect to DB:', err));

// Khởi tạo routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/tasks', taskRoute);
app.use('/api/indicators', indicatorRoute); // Thêm dòng này

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