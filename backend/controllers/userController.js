const User = require('../models/user');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id',
        'username',
        'email',
        'role',
        'is_active',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by'
      ],
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'Updater',
          attributes: ['id', 'username']
        }
      ]
    });

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

const createUser = async (req, res) => {
  const { username, email, password, role } = req.body;
  const currentUser = req.user;
  if (!currentUser || currentUser.role !== 'Superuser') {
    return res.status(403).json({ message: 'Only Superuser can create users' });
  }

  try {
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      created_by: currentUser.id,        
    });

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
      created_by: newUser.created_by,
      updated_by: newUser.updated_by
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(400).json({
      message: err.message || 'Failed to create user',
      error: err.errors?.[0]?.message || 'Validation error'
    });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, password, role, is_active } = req.body;

  const currentUser = req.user;
  if (!currentUser || currentUser.role !== 'Superuser') {
    return res.status(403).json({ message: 'Only Superuser can update users' });
  }

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (is_active !== undefined) user.is_active = is_active;

    if (password) {
      user.password = bcrypt.hashSync(password, 10);
    }

    user.updated_at = new Date();
    user.updated_by = currentUser.id;

    await user.save();

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      created_by: user.created_by,
      updated_by: user.updated_by
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(400).json({
      message: err.message || 'Failed to update user',
      error: err.errors?.[0]?.message || 'Validation error'
    });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  const currentUser = req.user;
  if (!currentUser || currentUser.role !== 'Superuser') {
    return res.status(403).json({ message: 'Only Superuser can delete users' });
  }

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};