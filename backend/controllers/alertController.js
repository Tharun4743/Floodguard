const db = require('../config/db');

// @desc    Get all active alerts
// @route   GET /api/alerts/live
// @access  Private
exports.getLiveAlerts = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, title, message, severity, location, status, latency_ms, target_population_reach, created_at FROM alerts ORDER BY created_at DESC LIMIT 30'
    );
    res.status(200).json({
      success: true,
      alerts: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new emergency alert manually
// @route   POST /api/alerts/create
// @access  Private (Admin or Coordinator)
exports.createAlert = async (req, res, next) => {
  const { title, message, severity, location } = req.body;

  if (!title || !message || !severity) {
    return res.status(400).json({
      success: false,
      message: 'title, message, and severity are required'
    });
  }

  try {
    const loc = location || 'Unspecified Sector';
    const result = await db.query(
      `INSERT INTO alerts (title, message, severity, location)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, message, severity.toUpperCase(), loc]
    );

    const newAlert = result.rows[0];

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'ALERT_CREATE', `Triggered manual emergency alert: ${title}`]
    );

    // Broadcast new alert via socket using exact event "alert:new"
    const io = req.app.get('io');
    if (io) {
      io.emit('alert:new', newAlert);
    }

    res.status(201).json({
      success: true,
      message: 'Emergency warning alert dispatched',
      alert: newAlert
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject pending AI-generated alerts (HITL Gate)
// @route   POST /api/alerts/:id/verify
// @access  Private (Admin)
exports.verifyAlert = async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  try {
    const checkAlert = await db.query('SELECT * FROM alerts WHERE id = $1', [id]);
    if (checkAlert.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const targetAlert = checkAlert.rows[0];
    if (targetAlert.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Alert is not pending verification' });
    }

    const newStatus = action === 'approve' ? 'dispatched' : 'rejected';
    
    // Simulate SMS dispatch latency calculations here
    const latency = action === 'approve' ? Math.floor(Math.random() * (450 - 150) + 150) : 0;

    const result = await db.query(
      'UPDATE alerts SET status = $1, latency_ms = $2 WHERE id = $3 RETURNING *',
      [newStatus, latency, id]
    );

    const updatedAlert = result.rows[0];

    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'ALERT_VERIFY', `HITL Gate: ${action.toUpperCase()} alert ID ${id}`]
    );

    // If approved, broadcast to the public via sockets
    if (action === 'approve') {
      const io = req.app.get('io');
      if (io) {
        io.emit('alert:new', updatedAlert);
      }
    }

    res.status(200).json({
      success: true,
      message: `Alert successfully ${newStatus}`,
      alert: updatedAlert
    });
  } catch (error) {
    next(error);
  }
};
