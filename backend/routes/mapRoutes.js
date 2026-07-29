const express = require('express');
const { getEvacuationRoutes } = require('../controllers/mapController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/evacuation-routes', protect, getEvacuationRoutes);

module.exports = router;
