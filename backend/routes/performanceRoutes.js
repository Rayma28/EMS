const express = require('express');
const { getReviews, addReview, updateReview, deleteReview} = require('../controllers/performanceController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['Admin', 'Manager', 'Superuser']), getReviews);
router.post('/', authenticate, authorize(['Manager', 'Admin']), addReview);
router.put('/:id', authenticate, authorize(['Manager', 'Admin']), updateReview);
router.delete('/:id', authenticate, authorize(['Manager', 'Admin']), deleteReview);

module.exports = router;