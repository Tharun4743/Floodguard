const express = require('express');
const { getChatMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getChatMessages);

module.exports = router;
