const express = require('express');
const { body } = require('express-validator');
const {
  createRescueRequest,
  getRescueRequests,
  getRescueRequestById,
  updateRescueRequest,
  deleteRescueRequest
} = require('../controllers/rescueController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.route('/')
  .post(
    [
      body('reporter_name', 'Reporter name is required').notEmpty(),
      body('reporter_contact', 'Reporter contact number is required').notEmpty(),
      body('location', 'Location detail is required').notEmpty(),
      body('people_count', 'People count must be at least 1').isInt({ min: 1 }),
      body('priority', 'Priority must be low, medium, high, or critical').optional().isIn(['low', 'medium', 'high', 'critical']),
      validate
    ],
    createRescueRequest
  )
  .get(getRescueRequests);

router.route('/:id')
  .get(getRescueRequestById)
  .put(updateRescueRequest)
  .delete(authorize('admin', 'coordinator'), deleteRescueRequest);

module.exports = router;
