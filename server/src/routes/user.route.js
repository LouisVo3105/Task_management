const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { 
  validateCreateUser, 
  validateUpdateUser 
} = require('../middlewares/user.validation');

// Protected routes
router.use(authMiddleware);

router.post('/', validateCreateUser, UserController.createUser);
router.get('/me', UserController.getUserProfile);
router.get('/', UserController.getAllUsers);
router.get('/subordinates', UserController.getSubordinates);
router.put('/:id', validateUpdateUser, UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;