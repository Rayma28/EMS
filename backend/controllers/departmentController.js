const { Department, Employee } = require('../models');

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addDepartment = async (req, res) => {
  const { department_name, description } = req.body;
  try {
    const department = await Department.create({ department_name, description });
    res.status(201).json(department);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateDepartment = async (req, res) => {
  const { department_name, description } = req.body;
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    await department.update({ department_name, description });
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const employeeCount = await Employee.count({
      where: { department_id: req.params.id }
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        message: `Cannot delete department: ${employeeCount} employee(s) are assigned to it`
      });
    }

    await department.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ message: 'Failed to delete department' });
  }
};

module.exports = { getDepartments, getDepartmentById, addDepartment, updateDepartment, deleteDepartment };