const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { 
  validateCreateUser, 
  validateUpdateUser 
} = require('../middlewares/user.validation');

// Protected routes
router.use(authMiddleware);

router.post('/create', validateCreateUser, UserController.createUser.bind(UserController));
router.get('/me', UserController.getUserProfile.bind(UserController));
router.get('/all', UserController.getAllUsers.bind(UserController));
router.get('/subordinates', UserController.getSubordinates.bind(UserController));
router.put('/:id', validateUpdateUser, UserController.updateUser.bind(UserController));
router.delete('/:id', UserController.deleteUser.bind(UserController));
router.delete('/permanent/:id', UserController.deleteUserPermanently.bind(UserController));

module.exports = router;