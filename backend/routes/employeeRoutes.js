const express = require('express');
const { getEmployees, getEmployeeById, addEmployee, updateEmployee, deleteEmployee, getCurrentEmployee} = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize(['Admin', 'HR', 'Manager', 'Superuser']), getEmployees);
router.get('/current', authenticate, authorize(['Admin', 'HR', 'Superuser', 'Employee', 'Manager']), getCurrentEmployee);
router.get('/:id', authenticate, authorize(['Admin', 'HR', 'Superuser']), getEmployeeById);
router.post('/', authenticate, authorize(['Admin', 'HR', 'Superuser']), addEmployee); 
router.put('/:id', authenticate, authorize(['Admin', 'HR', 'Superuser']), updateEmployee); 
router.delete('/:id', authenticate, authorize(['Admin', 'HR', 'Superuser']), deleteEmployee);

module.exports = router;