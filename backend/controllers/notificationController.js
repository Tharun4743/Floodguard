const db = require('../config/db');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    // Get notifications broadcast to everyone (user_id is null) OR targeting the logged-in user
    const result = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      notifications: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  const { id } = req.params;

  try {
    const checkResult = await db.query('SELECT * FROM notifications WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Notification ${id} not found`
      });
    }

    const notification = checkResult.rows[0];

    // Access control
    if (notification.user_id && notification.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this notification'
      });
    }

    await db.query('UPDATE notifications SET status = \'read\' WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};
