const express = require('express');
const { getReviews, addReview, updateReview } = require('../controllers/performanceController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['Admin', 'Manager', 'Superuser']), getReviews);
router.post('/', authenticate, authorize(['Manager', 'Admin']), addReview);
router.put('/:id', authenticate, authorize(['Manager', 'Admin']), updateReview);

module.exports = router;