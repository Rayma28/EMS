const express = require('express');
const { login, logout, register } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/register', authenticate, authorize(['Admin', 'Superuser']), register);

module.exports = router;