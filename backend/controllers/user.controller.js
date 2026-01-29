const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { createAuditLog, getAuditLogs } = require('../utils/auditLog');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (status !== undefined) {
      whereClause += ' AND is_active = ?';
      params.push(status === 'active');
    }

    const [users] = await pool.query(
      `SELECT id, username, email, full_name, role, phone, avatar, is_active, last_login, created_at
       FROM users WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, username, email, full_name, role, phone, avatar, is_active, last_login, created_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create user
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, fullName, role, phone } = req.body;

    // Validate required fields
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required'
      });
    }

    // Check if username or email exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password, full_name, role, phone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, fullName, role || 'staff', phone]
    );

    // Audit log
    await createAuditLog(req.user.id, 'CREATE', 'users', result.insertId, null, { username, email, fullName, role }, req);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { username, email, fullName, role, phone, isActive } = req.body;
    const userId = req.params.id;

    // Get current user data
    const [currentUser] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

    if (currentUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check for duplicate username/email
    if (username || email) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
        [username || '', email || '', userId]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already in use'
        });
      }
    }

    await pool.query(
      `UPDATE users SET 
        username = COALESCE(?, username),
        email = COALESCE(?, email),
        full_name = COALESCE(?, full_name),
        role = COALESCE(?, role),
        phone = COALESCE(?, phone),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [username, email, fullName, role, phone, isActive, userId]
    );

    // Audit log
    await createAuditLog(req.user.id, 'UPDATE', 'users', userId, currentUser[0], { username, email, fullName, role, phone, isActive }, req);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent self-deletion
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hard delete - remove from database
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    // Audit log
    await createAuditLog(req.user.id, 'DELETE', 'users', userId, user[0], null, req);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reset user password (Admin only)
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const [user] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    // Audit log
    await createAuditLog(req.user.id, 'PASSWORD_RESET', 'users', userId, null, null, req);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { userId, action, entityType, startDate, endDate, page = 1, limit = 20 } = req.query;

    const result = await getAuditLogs(
      { userId, action, entityType, startDate, endDate },
      parseInt(page),
      parseInt(limit)
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
