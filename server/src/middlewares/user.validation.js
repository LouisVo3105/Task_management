"use strict";
const { body, validationResult } = require('express-validator');
const { mapPosition, getStandardPositions } = require('../utils/position-mapper');
const { ROLES } = require('../configs/enum');


exports.validateCreateUser = [
  body('username').trim().notEmpty().isLength({ min: 3 }).withMessage('Tên đăng nhập phải có ít nhất 3 ký tự'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
  body('fullName').trim().notEmpty().withMessage('Tên đầy đủ là bắt buộc'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Vị trí là bắt buộc')
    .custom((value) => {
      const mappedPosition = mapPosition(value);
      const standardPositions = getStandardPositions();
      if (!standardPositions.includes(mappedPosition)) {
        throw new Error(`Vị trí không hợp lệ. Các vị trí hợp lệ: ${standardPositions.join(', ')}`);
      }
      return true;
    }),
  body('phoneNumber').isMobilePhone().withMessage('Số điện thoại không hợp lệ'),
  body('department').trim().notEmpty().withMessage('Phòng ban là bắt buộc'),
  body('role').isIn(ROLES).withMessage('Vai trò không hợp lệ'),
  body('directSupervisor')
    .if(body('role').isIn(ROLES.filter(r => r !== 'admin')))
    .notEmpty()
    .isMongoId()
    .withMessage('Cấp trên trực tiếp là bắt buộc cho vai trò user hoặc manager'),
  
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
  body('fullName').optional().trim().notEmpty().withMessage('Tên đầy đủ không được để trống'),
  body('position')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Vị trí không được để trống')
    .custom((value) => {
      if (!value) return true; // Skip validation if not provided
      const mappedPosition = mapPosition(value);
      const standardPositions = getStandardPositions();
      if (!standardPositions.includes(mappedPosition)) {
        throw new Error(`Vị trí không hợp lệ. Các vị trí hợp lệ: ${standardPositions.join(', ')}`);
      }
      return true;
    }),
  body('phoneNumber').optional().isMobilePhone().withMessage('Số điện thoại không hợp lệ'),
  body('department').optional().trim().notEmpty().withMessage('Phòng ban không được để trống'),
  body('role').optional().isIn(ROLES).withMessage('Vai trò không hợp lệ'),
  body('isActive').optional().isBoolean().withMessage('Trạng thái hoạt động không hợp lệ'),
  body('directSupervisor')
    .if(body('role').isIn(ROLES.filter(r => r !== 'admin')))
    .notEmpty()
    .isMongoId()
    .withMessage('Cấp trên trực tiếp là bắt buộc cho vai trò user hoặc manager'),
  
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