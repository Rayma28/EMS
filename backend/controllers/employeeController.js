// backend/controllers/employeeController.js
const { Employee, User, Department } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
}).array('documents', 5);

const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        { model: User, required: true },
        { model: Department, required: false },
      ],
    });

    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      return isNaN(d) ? 'N/A' : d.toLocaleDateString('en-IN');
    };

    const list = employees.map((e) => ({
      id: e.employee_id,
      name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'N/A',
      email: e.User?.email || 'N/A',
      department: e.Department?.department_name || 'N/A',
      designation: e.designation || 'N/A',
      salary: Number(e.salary) || 0,
      status: e.status || 'Active',
      joining_date: formatDate(e.joining_date),
      next_increment: formatDate(e.next_increment),
      is_experienced: e.is_experienced,
      previous_company: e.previous_company,
      previous_salary: e.previous_salary ? Number(e.previous_salary) : null,
      first_name: e.first_name || '',
      last_name: e.last_name || '',
      user_id: e.user_id,
      raw: e,
    }));

    res.json(list);
  } catch (err) {
    console.error('getEmployees error:', err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const id = req.params.id;

    // Prevent non-numeric IDs from causing DB errors
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    const employee = await Employee.findByPk(id, {
      include: [User, Department],
    });

    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    res.json(employee);
  } catch (err) {
    console.error('getEmployeeById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getCurrentEmployee = async (req, res) => {
  try {
    const userId = req.user.id;

    const employee = await Employee.findOne({
      where: { user_id: userId },
      include: [
        { model: User, attributes: ['id', 'username', 'email', 'role'] },
        { model: Department },
      ],
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    res.json(employee);
  } catch (err) {
    console.error('getCurrentEmployee error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const addEmployee = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error during add:', err);
      return res.status(400).json({ message: err.message || 'File upload error' });
    }

    const {
      user_id,
      first_name,
      last_name,
      dob,
      gender,
      phone,
      address,
      joining_date,
      department_id,
      designation,
      salary,
      status = 'Active',
      is_experienced = false,
      previous_company,
      previous_salary,
      next_increment,
    } = req.body;

    if (!user_id || !first_name || !last_name || !joining_date || !designation || !salary) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const existing = await Employee.findOne({ where: { user_id } });
      if (existing) {
        return res.status(400).json({ message: 'User is already assigned to an employee' });
      }

      const documents = req.files?.map(file => file.path) || [];

      const employee = await Employee.create({
        user_id: Number(user_id),
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        dob: dob || null,
        gender: gender || null,
        phone: phone || null,
        address: address || null,
        joining_date,
        department_id: department_id ? Number(department_id) : null,
        designation: designation.trim(),
        salary: Number(salary),
        status,
        is_experienced: is_experienced === 'true' || is_experienced === true,
        previous_company: is_experienced ? (previous_company?.trim() || null) : null,
        previous_salary: is_experienced && previous_salary ? Number(previous_salary) : null,
        next_increment: next_increment || null,
        documents: documents.length > 0 ? JSON.stringify(documents) : null,
      });

      const newEmployee = await Employee.findByPk(employee.employee_id, {
        include: [User, Department],
      });

      res.status(201).json(newEmployee);
    } catch (err) {
      console.error('Error creating employee:', err);
      res.status(500).json({ message: err.message || 'Failed to create employee' });
    }
  });
};

const updateEmployee = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer error during update:', err);
      return res.status(400).json({ message: err.message || 'File upload error' });
    }

    const employeeId = req.params.id;

    if (isNaN(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    const {
      first_name,
      last_name,
      dob,
      gender,
      phone,
      address,
      joining_date,
      department_id,
      designation,
      salary,
      status,
      is_experienced,
      previous_company,
      previous_salary,
      next_increment,
    } = req.body;

    try {
      const employee = await Employee.findByPk(employeeId, { include: [User] });
      if (!employee) return res.status(404).json({ message: 'Employee not found' });

      let documents = employee.documents ? JSON.parse(employee.documents) : [];

      if (req.files && req.files.length > 0) {
        const newFiles = req.files.map(file => file.path);
        documents = [...documents, ...newFiles];
      }

      const updatedData = {
        first_name: first_name ? first_name.trim() : employee.first_name,
        last_name: last_name ? last_name.trim() : employee.last_name,
        dob: dob !== undefined ? (dob || null) : employee.dob,
        gender: gender !== undefined ? gender : employee.gender,
        phone: phone !== undefined ? phone : employee.phone,
        address: address !== undefined ? address : employee.address,
        joining_date: joining_date !== undefined ? joining_date : employee.joining_date,
        department_id: department_id !== undefined ? (department_id ? Number(department_id) : null) : employee.department_id,
        designation: designation ? designation.trim() : employee.designation,
        salary: salary !== undefined ? Number(salary) : employee.salary,
        status: status !== undefined ? status : employee.status,
        is_experienced: is_experienced !== undefined ? (is_experienced === 'true' || is_experienced === true) : employee.is_experienced,
        previous_company: is_experienced ? (previous_company?.trim() || null) : null,
        previous_salary: is_experienced && previous_salary ? Number(previous_salary) : null,
        next_increment: next_increment !== undefined ? next_increment : employee.next_increment,
        documents: documents.length > 0 ? JSON.stringify(documents) : null,
      };

      await employee.update(updatedData);

      const updatedEmployee = await Employee.findByPk(employeeId, {
        include: [User, Department],
      });

      res.json(updatedEmployee);
    } catch (err) {
      console.error('Error updating employee:', err);
      res.status(500).json({ message: err.message || 'Failed to update employee' });
    }
  });
};

const deleteEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;

    if (isNaN(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    const employee = await Employee.findByPk(employeeId, { include: [User] });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Delete uploaded documents
    if (employee.documents) {
      try {
        const files = JSON.parse(employee.documents);
        files.forEach((filePath) => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      } catch (parseErr) {
        console.error('Error deleting documents:', parseErr);
      }
    }

    await employee.destroy();
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ message: err.message || 'Failed to delete employee' });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  getCurrentEmployee,    
  addEmployee,
  updateEmployee,
  deleteEmployee,
};