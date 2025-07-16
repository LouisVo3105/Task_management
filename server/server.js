const app = require("./src/app");

const PORT = process.env.PORT || 3056

// Cấu hình server để tăng khả năng chịu tải
const server = app.listen(PORT, {
  // Tăng backlog để xử lý nhiều connection pending
  backlog: 511,
  // Tăng timeout
  timeout: 30000,
  // Keep-alive
  keepAlive: true,
  keepAliveTimeout: 30000,
  headersTimeout: 31000
}, () => {
  console.log(`Quan ly chi tieu on port ${PORT}`);
});

// Tăng max listeners
server.setMaxListeners(0);

// --- SOCKET.IO ---
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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