const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { checkAuth, isAdmin, isStaff } = require('../utils/checkAuth');
const { ticketLimiter } = require('../utils/rateLimiters');
const Ticket = require('../models/Ticket');

// All ticket routes are protected
router.use(checkAuth);

// Get routes
router.get("/create", ticketController.getCreateTicket);
router.get("/", ticketController.getTickets);
router.get("/:id", ticketController.getTicket);

// Apply rate limiter to ticket creation
router.post("/create", ticketLimiter, ticketController.createTicket);
router.post("/:id/respond", ticketController.addResponse);
router.post("/:id/update", isStaff, ticketController.updateTicket);
router.post("/:id/assign", isAdmin, ticketController.assignTicket);

// DELETE route - Admin only
router.post('/:id/delete', isAdmin, async (req, res) => {
    try {
        const ticketId = req.params.id;
        
        // Simply delete the ticket (no soft delete)
        await Ticket.findByIdAndDelete(ticketId);
        
        // If this is an AJAX request
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({ success: true });
        }
        
        // Redirect to tickets list
        return res.redirect('/tickets');
    } catch (error) {
        console.error('Error deleting ticket:', error);
        
        // If this is an AJAX request
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error deleting ticket' 
            });
        }
        
        // Otherwise, show error page
        return res.status(500).render('error', {
            title: 'Error',
            user: req.user,
            message: 'Error deleting ticket. Please try again.'
        });
    }
});

module.exports = router;