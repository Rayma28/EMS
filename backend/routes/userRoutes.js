const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize(['Admin', 'HR', 'Manager', 'Superuser']), userController.getUsers);

router.post('/', authorize(['Superuser', 'Admin']), userController.createUser);
router.put('/:id', authorize(['Superuser', 'Admin']), userController.updateUser);
router.delete('/:id', authorize(['Superuser', 'Admin']), userController.deleteUser);

module.exports = router;