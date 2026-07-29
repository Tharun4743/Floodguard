const db = require('../config/db');

// @desc    Get recent chat messages
// @route   GET /api/chat
// @access  Private
exports.getChatMessages = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.message, c.timestamp, u.id as user_id, u.name as user_name, u.role as user_role
       FROM chat_messages c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.timestamp DESC
       LIMIT 50`
    );

    // Return in chronological order
    const messages = result.rows.reverse();

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};
