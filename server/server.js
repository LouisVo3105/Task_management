"use strict";
const app = require("./src/app");

const PORT = process.env.PORT
const CLIENT_URL = process.env.CLIENT;

// Cấu hình server để tăng khả năng chịu tải
const server = app.listen(PORT, {

  backlog: 511,

  timeout: 30000,

  keepAlive: true,
  keepAliveTimeout: 30000,
  headersTimeout: 31000
}, () => {
  console.log(`Ứng dụng quản lý chỉ tiêu đang chạy trên cổng ${PORT}`);
});

// Tăng max listeners
server.setMaxListeners(0);

// --- SOCKET.IO ---
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL],
    credentials: true
  }
});

io.on('connection', (socket) => {
  // Tham gia vào indicator room
  socket.on('joinIndicator', (indicatorId) => {
    socket.join(`indicator_${indicatorId}`);
  });
  // Rời khỏi indicator room
  socket.on('leaveIndicator', (indicatorId) => {
    socket.leave(`indicator_${indicatorId}`);
  });
  // Khi có comment mới
  socket.on('newComment', (data) => {
    // data phải chứa indicatorId và comment
    if (data && data.indicatorId && data.comment) {
      io.to(`indicator_${data.indicatorId}`).emit('newComment', data.comment);
    }
  });
});

// --- END SOCKET.IO ---

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Performing graceful shutdown...');
  server.close(() => {
    console.log(`Server closed`);
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  server.close(() => {
    console.log(`Server closed`);
    process.exit(0);
  });
});