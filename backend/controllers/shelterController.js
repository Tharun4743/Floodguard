const db = require('../config/db');

// @desc    Get all shelter safe zones
// @route   GET /api/shelters
// @access  Private
exports.getShelters = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM safe_zones ORDER BY id ASC');
    res.status(200).json({
      success: true,
      count: result.rows.length,
      shelters: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new shelter safe zone
// @route   POST /api/shelters
// @access  Private (Admin or Coordinator)
exports.createShelter = async (req, res, next) => {
  const { name, location, capacity, occupancy, status } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO safe_zones (name, location, capacity, occupancy, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, location, capacity, occupancy || 0, status || 'open']
    );

    const newShelter = result.rows[0];

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'SHELTER_CREATE', `Created shelter ${name} (Capacity: ${capacity})`]
    );

    // Broadcast new shelter
    const io = req.app.get('io');
    if (io) {
      io.emit('shelter_created', newShelter);
    }

    res.status(201).json({
      success: true,
      message: 'Shelter safe zone created successfully',
      shelter: newShelter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a shelter safe zone
// @route   PUT /api/shelters/:id
// @access  Private (Admin, Coordinator, or Responder)
exports.updateShelter = async (req, res, next) => {
  const { id } = req.params;
  const { name, location, capacity, occupancy, status } = req.body;

  try {
    // Check if shelter exists
    const checkResult = await db.query('SELECT * FROM safe_zones WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Shelter ${id} not found`
      });
    }

    const shelter = checkResult.rows[0];

    // Allowed values
    const updatedName = name || shelter.name;
    const updatedLocation = location || shelter.location;
    const updatedCapacity = capacity !== undefined ? capacity : shelter.capacity;
    const updatedOccupancy = occupancy !== undefined ? occupancy : shelter.occupancy;
    let updatedStatus = status || shelter.status;

    // Auto-update status to full if occupancy matches or exceeds capacity
    if (updatedOccupancy >= updatedCapacity && status === undefined) {
      updatedStatus = 'full';
    } else if (updatedOccupancy < updatedCapacity && shelter.status === 'full' && status === undefined) {
      updatedStatus = 'open';
    }

    const updateResult = await db.query(
      `UPDATE safe_zones
       SET name = $1, location = $2, capacity = $3, occupancy = $4, status = $5
       WHERE id = $6
       RETURNING *`,
      [updatedName, updatedLocation, updatedCapacity, updatedOccupancy, updatedStatus, id]
    );

    const updatedShelter = updateResult.rows[0];

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'SHELTER_UPDATE', `Updated shelter ID ${id} (Occupancy: ${updatedOccupancy}/${updatedCapacity}, Status: ${updatedStatus})`]
    );

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.emit('shelter_updated', updatedShelter);

      // Notify if status transitioned
      if (updatedStatus !== shelter.status) {
        io.emit('notification', {
          id: Date.now(),
          title: `Shelter Status Change`,
          message: `Evacuation shelter "${updatedName}" is now ${updatedStatus.toUpperCase()}.`,
          type: 'info',
          created_at: new Date()
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Shelter safe zone updated successfully',
      shelter: updatedShelter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a shelter safe zone
// @route   DELETE /api/shelters/:id
// @access  Private (Admin or Coordinator Only)
exports.deleteShelter = async (req, res, next) => {
  const { id } = req.params;

  try {
    const checkResult = await db.query('SELECT name FROM safe_zones WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Shelter ${id} not found`
      });
    }

    await db.query('DELETE FROM safe_zones WHERE id = $1', [id]);

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'SHELTER_DELETE', `Deleted shelter ID ${id} (${checkResult.rows[0].name})`]
    );

    // Broadcast deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('shelter_deleted', id);
    }

    res.status(200).json({
      success: true,
      message: `Shelter ${id} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};
