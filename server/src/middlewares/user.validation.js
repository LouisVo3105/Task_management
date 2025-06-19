const { body, validationResult } = require('express-validator');

exports.validateCreateUser = [
  body('username').trim().notEmpty().isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  body('email').isEmail().normalizeEmail(),
  body('fullName').trim().notEmpty(),
  body('position').trim().notEmpty(),
  body('phoneNumber').isMobilePhone(),
  body('department').trim().notEmpty(),
  body('role').isIn(['admin', 'manager', 'user']),
  body('directSupervisor').if(body('role').equals('user'))
    .notEmpty().withMessage('Direct supervisor is required for users'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  }
];

exports.validateUpdateUser = [
  body('fullName').optional().trim().notEmpty(),
  body('position').optional().trim().notEmpty(),
  body('phoneNumber').optional().isMobilePhone(),
  body('department').optional().trim().notEmpty(),
  body('role').optional().isIn(['admin', 'manager', 'user']),
  body('isActive').optional().isBoolean(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  }
];