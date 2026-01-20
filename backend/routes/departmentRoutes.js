const express = require('express');
const { getDepartments, getDepartmentById, addDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['Admin', 'HR', 'Superuser']), getDepartments);
router.get('/:id', authenticate, authorize(['Admin', 'Superuser']), getDepartmentById);
router.post('/', authenticate, authorize(['Admin', 'Superuser']), addDepartment);
router.put('/:id', authenticate, authorize(['Admin', 'Superuser']), updateDepartment);
router.delete('/:id', authenticate, authorize(['Admin', 'Superuser']), deleteDepartment);

module.exports = router;