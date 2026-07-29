const express = require('express');
const { body } = require('express-validator');
const {
  getShelters,
  createShelter,
  updateShelter,
  deleteShelter
} = require('../controllers/shelterController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getShelters)
  .post(
    [
      authorize('admin', 'coordinator'),
      body('name', 'Shelter name is required').notEmpty(),
      body('location', 'Location description is required').notEmpty(),
      body('capacity', 'Total shelter capacity must be at least 1').isInt({ min: 1 }),
      validate
    ],
    createShelter
  );

router.route('/:id')
  .put(authorize('admin', 'coordinator', 'responder'), updateShelter)
  .delete(authorize('admin', 'coordinator'), deleteShelter);

module.exports = router;
