const jwt = require('jsonwebtoken');

const tokenBlacklist = new Set();

const verifyRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid refresh token' });
    req.user = user;
    next();
  });
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: 'Token revoked' });
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Phân biệt các loại lỗi token
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Malformed token';
    }
    
    res.status(401).json({ 
      success: false, 
      message 
    });
  }
};

module.exports = {authMiddleware, verifyRefreshToken};