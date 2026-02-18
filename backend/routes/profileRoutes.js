// backend/routes/profileRoutes.js (or profile.js)
const express = require('express');
const router = express.Router();

const { 
  getMyProfile, 
  updateMyProfile 
} = require('../controllers/profileController');

const { 
  createProfileEditRequest,
  getPendingProfileRequests,     
  approveProfileRequest,        
  rejectProfileRequest          
} = require('../controllers/profileRequestController');

const { 
  getProfileEditByToken, 
  submitProfileEditByToken 
} = require('../controllers/profileEditController');

const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize(['Employee', 'HR', 'Superuser', 'Manager', 'Admin']), getMyProfile);
router.put('/', authenticate, authorize(['Employee', 'HR', 'Superuser', 'Manager', 'Admin']), updateMyProfile);

router.post('/profile-request', authenticate, authorize(['Employee', 'HR', 'Superuser', 'Manager', 'Admin']), createProfileEditRequest);

router.get('/edit/:token', authenticate, authorize(['Employee', 'HR', 'Superuser', 'Manager', 'Admin']), getProfileEditByToken);
router.post('/edit/:token', authenticate, authorize(['Employee', 'HR', 'Superuser', 'Manager', 'Admin']), submitProfileEditByToken);

router.get(
  '/profile-requests/pending',
  authenticate,
  authorize(['HR']),
  getPendingProfileRequests
);

router.post(
  '/profile-requests/:id/approve',
  authenticate,
  authorize(['HR']),
  approveProfileRequest
);

router.post(
  '/profile-requests/:id/reject',
  authenticate,
  authorize(['HR']),
  rejectProfileRequest
);

module.exports = router;