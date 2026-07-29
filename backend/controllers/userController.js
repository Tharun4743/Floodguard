const bcrypt = require('bcryptjs');
const db = require('../config/db');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin or Coordinator)
exports.getUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, status, created_at FROM users ORDER BY id ASC'
    );
    res.status(200).json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin, Coordinator, or Self)
exports.getUserById = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Check permission: Self, Coordinator or Admin
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin' && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user profile'
      });
    }

    const result = await db.query(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found`
      });
    }

    res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin, Coordinator, or Self)
exports.updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, role, status, password } = req.body;

  try {
    // Check permission: Self, Coordinator or Admin
    if (req.user.id !== parseInt(id) && req.user.role !== 'admin' && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user profile'
      });
    }

    // Verify user exists
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found`
      });
    }

    const user = userResult.rows[0];

    // Gather update fields
    let updatedName = name || user.name;
    let updatedEmail = email || user.email;
    let updatedRole = user.role;
    let updatedStatus = user.status;
    let updatedPasswordHash = user.password_hash;

    // Role and status updates restricted to Admin
    if (req.user.role === 'admin') {
      if (role) updatedRole = role;
      if (status) updatedStatus = status;
    }

    // If password provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedPasswordHash = await bcrypt.hash(password, salt);
    }

    // Perform update
    const updateResult = await db.query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, status = $4, password_hash = $5
       WHERE id = $6
       RETURNING id, name, email, role, status, created_at`,
      [updatedName, updatedEmail, updatedRole, updatedStatus, updatedPasswordHash, id]
    );

    // Write activity log
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'USER_UPDATE', `Updated user ID ${id}`]
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin Only)
exports.deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const userResult = await db.query('SELECT name FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${id} not found`
      });
    }

    // Don't allow deleting yourself
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account'
      });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    // Write activity log
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'USER_DELETE', `Deleted user ID ${id} (${userResult.rows[0].name})`]
    );

    res.status(200).json({
      success: true,
      message: `User with ID ${id} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};
