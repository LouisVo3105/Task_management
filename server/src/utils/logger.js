const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function createModuleLogger(moduleName) {
  return winston.createLogger({
    level: 'error', // chỉ log error trở lên
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, stack }) =>
        `${timestamp} [${level.toUpperCase()}] ${message}${stack ? '\n' + stack : ''}`
      )
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, `${moduleName}.txt`),
        handleExceptions: true,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    ],
    exitOnError: false
  });
}

module.exports = { createModuleLogger }; 