const db = require('../config/db');

exports.getEvacuationRoutes = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM evacuation_routes ORDER BY created_at DESC LIMIT 50');
    res.status(200).json({
      success: true,
      routes: result.rows
    });
  } catch (error) {
    next(error);
  }
};
