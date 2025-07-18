"use strict";
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { 
  validateCreateUser, 
  validateUpdateUser 
} = require('../middlewares/user.validation');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { roleMiddleware } = require('../middlewares/auth.middleware');

// Protected routes
router.use(authMiddleware);

router.post('/create', validateCreateUser, UserController.createUser.bind(UserController));
router.get('/me', UserController.getUserProfile.bind(UserController));
router.get('/all', UserController.getAllUsers.bind(UserController));
router.get('/subordinates', UserController.getSubordinates.bind(UserController));
router.put('/:id', validateUpdateUser, UserController.updateUser.bind(UserController));
router.delete('/:id', UserController.deleteUser.bind(UserController));
router.delete('/permanent/:id', UserController.deleteUserPermanently.bind(UserController));
router.post('/import-csv', roleMiddleware(['admin']), upload.single('file'), UserController.importUsersFromCSV.bind(UserController));
router.get('/export', roleMiddleware(['admin']), UserController.exportUsers.bind(UserController));
router.get('/positions', UserController.getPositions.bind(UserController));
router.get('/leaders', UserController.getLeaders.bind(UserController));

module.exports = router;