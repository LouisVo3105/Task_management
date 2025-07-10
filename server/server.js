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