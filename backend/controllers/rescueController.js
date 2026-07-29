const db = require('../config/db');

// @desc    Create a rescue request
// @route   POST /api/rescue
// @access  Private
exports.createRescueRequest = async (req, res, next) => {
  const { reporter_name, reporter_contact, location, people_count, priority, notes } = req.body;

  try {
    const userId = req.user.role === 'resident' ? req.user.id : null;

    const result = await db.query(
      `INSERT INTO rescue_requests (user_id, reporter_name, reporter_contact, location, people_count, priority, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [userId, reporter_name, reporter_contact, location, people_count || 1, priority || 'medium', notes]
    );

    const newRequest = result.rows[0];

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'RESCUE_CREATE', `Created rescue request ID ${newRequest.id} at ${location}`]
    );

    // Broadcast new rescue request in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('rescue_created', newRequest);
      // Trigger a live broadcast notification
      io.emit('notification', {
        id: Date.now(), // temporary UI id
        title: `🚨 EMERGENCY REQUEST (${newRequest.priority.toUpperCase()})`,
        message: `${newRequest.reporter_name} requested assistance for ${newRequest.people_count} people in ${newRequest.location}`,
        type: 'warning',
        created_at: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Rescue request submitted successfully',
      request: newRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get rescue requests queue
// @route   GET /api/rescue
// @access  Private
exports.getRescueRequests = async (req, res, next) => {
  try {
    let result;

    if (req.user.role === 'resident') {
      // Residents only see their own requests
      result = await db.query(
        `SELECT r.*, u.name as assigned_to_name
         FROM rescue_requests r
         LEFT JOIN users u ON r.assigned_to = u.id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC`,
        [req.user.id]
      );
    } else {
      // Responders, Coordinators, Admins see all requests
      result = await db.query(
        `SELECT r.*, u.name as assigned_to_name
         FROM rescue_requests r
         LEFT JOIN users u ON r.assigned_to = u.id
         ORDER BY 
           CASE r.status 
             WHEN 'pending' THEN 1
             WHEN 'assigned' THEN 2
             WHEN 'resolved' THEN 3
             ELSE 4
           END,
           CASE r.priority
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
             ELSE 5
           END,
           r.created_at DESC`
      );
    }

    res.status(200).json({
      success: true,
      count: result.rows.length,
      requests: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single rescue request details
// @route   GET /api/rescue/:id
// @access  Private
exports.getRescueRequestById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT r.*, u.name as assigned_to_name, u2.name as reporter_user_name
       FROM rescue_requests r
       LEFT JOIN users u ON r.assigned_to = u.id
       LEFT JOIN users u2 ON r.user_id = u2.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Rescue request ${id} not found`
      });
    }

    const request = result.rows[0];

    // Access control: Resident can only view their own request
    if (req.user.role === 'resident' && request.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this rescue request'
      });
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update rescue request (Assign responder, change status/priority)
// @route   PUT /api/rescue/:id
// @access  Private
exports.updateRescueRequest = async (req, res, next) => {
  const { id } = req.params;
  const { status, priority, notes, assigned_to } = req.body;

  try {
    // Check if request exists
    const checkResult = await db.query('SELECT * FROM rescue_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Rescue request ${id} not found`
      });
    }

    const request = checkResult.rows[0];

    // Access Control
    if (req.user.role === 'resident') {
      // Residents can only cancel their request if it is still pending
      if (request.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this rescue request'
        });
      }
      if (status && status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Residents can only update status to cancelled'
        });
      }
      if (request.status !== 'pending' && status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel request once it has been assigned or resolved'
        });
      }
    }

    // Determine values to update
    const updatedStatus = status || request.status;
    const updatedPriority = priority || request.priority;
    const updatedNotes = notes || request.notes;
    let updatedAssignedTo = request.assigned_to;

    // Coordinators/Admins/Responders can assign to
    if (req.user.role !== 'resident' && assigned_to !== undefined) {
      updatedAssignedTo = assigned_to;
    }

    // Perform Update
    const updateResult = await db.query(
      `UPDATE rescue_requests
       SET status = $1, priority = $2, notes = $3, assigned_to = $4
       WHERE id = $5
       RETURNING *`,
      [updatedStatus, updatedPriority, updatedNotes, updatedAssignedTo, id]
    );

    const updatedRequest = updateResult.rows[0];

    // Get responder name if assigned
    let responderName = 'None';
    if (updatedRequest.assigned_to) {
      const respResult = await db.query('SELECT name FROM users WHERE id = $1', [updatedRequest.assigned_to]);
      if (respResult.rows.length > 0) responderName = respResult.rows[0].name;
    }
    updatedRequest.assigned_to_name = responderName;

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'RESCUE_UPDATE', `Updated rescue request ID ${id} (Status: ${updatedStatus}, Assigned To: ${responderName})`]
    );

    // Broadcast update in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit('rescue_updated', updatedRequest);

      // Notify the specific resident who filed the request
      if (request.user_id) {
        io.emit(`notification_user_${request.user_id}`, {
          id: Date.now(),
          title: `Update on Rescue Request #${id}`,
          message: `Your rescue request status has been updated to: "${updatedStatus.toUpperCase()}"` + 
                   (updatedRequest.assigned_to ? ` and assigned to responder ${responderName}.` : '.'),
          type: 'info',
          created_at: new Date()
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Rescue request updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete rescue request
// @route   DELETE /api/rescue/:id
// @access  Private (Admin/Coordinator only)
exports.deleteRescueRequest = async (req, res, next) => {
  const { id } = req.params;

  try {
    const checkResult = await db.query('SELECT id FROM rescue_requests WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Rescue request ${id} not found`
      });
    }

    await db.query('DELETE FROM rescue_requests WHERE id = $1', [id]);

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'RESCUE_DELETE', `Deleted rescue request ID ${id}`]
    );

    // Broadcast deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('rescue_deleted', id);
    }

    res.status(200).json({
      success: true,
      message: `Rescue request ${id} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};
