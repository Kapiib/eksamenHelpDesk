const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { checkAuth, isAdmin } = require('../utils/checkAuth');

// All ticket routes are protected
router.use(checkAuth);

// POST routes only (data processing, not page rendering)
router.post('/create', ticketController.createTicket);
router.post('/:id/respond', ticketController.addResponse);
router.post('/:id/update', ticketController.updateTicket);

module.exports = router;