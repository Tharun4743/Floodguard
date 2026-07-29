const { runAIFloodPrediction } = require('../services/predictionEngine');
const db = require('../config/db');

// @desc    Get latest flood risk prediction
// @route   GET /api/flood/risk
// @access  Private
exports.getFloodRisk = async (req, res, next) => {
  const lat = req.query.lat ? parseFloat(req.query.lat) : 13.0827;
  const lon = req.query.lon ? parseFloat(req.query.lon) : 80.2707;

  try {
    // Check if we have a recent prediction in the DB (e.g. within 5 minutes)
    const recentPred = await db.query(
      `SELECT * FROM flood_predictions 
       WHERE created_at > NOW() - INTERVAL '5 minutes'
       ORDER BY created_at DESC LIMIT 1`
    );

    if (recentPred.rows.length > 0) {
      const pred = recentPred.rows[0];
      return res.status(200).json({
        success: true,
        risk: {
          riskLevel: pred.risk_level,
          probability: parseFloat(pred.probability),
          reasons: pred.reason.split('; '),
          affectedAreas: [pred.location + ' region'],
          timestamp: pred.created_at
        }
      });
    }

    // Otherwise trigger a live calculation run
    const result = await runAIFloodPrediction(lat, lon);
    res.status(200).json({
      success: true,
      risk: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger a manual AI flood risk prediction
// @route   POST /api/ai/predict
// @access  Private (Admin or Coordinator)
exports.triggerAIPredict = async (req, res, next) => {
  const lat = req.body.lat ? parseFloat(req.body.lat) : 13.0827;
  const lon = req.body.lon ? parseFloat(req.body.lon) : 80.2707;

  try {
    const result = await runAIFloodPrediction(lat, lon);

    // Log operational activity log
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'AI_PREDICT', `Manually triggered AI flood prediction: ${result.riskLevel} (${(result.probability*100).toFixed(0)}%)`]
    );

    // Broadcast prediction changes to clients
    const io = req.app.get('io');
    if (io) {
      io.emit('prediction_update', result);
    }

    res.status(200).json({
      success: true,
      message: 'AI prediction model completed successfully',
      risk: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get historical weather/rainfall charts data
// @route   GET /api/flood/history
// @access  Private
exports.getHistoricalData = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, date, rainfall, temperature, flood_status FROM historical_weather ORDER BY date ASC'
    );
    res.status(200).json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    next(error);
  }
};
