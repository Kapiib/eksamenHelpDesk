const Ticket = require('../models/Ticket');
const User = require('../models/User');

const ticketController = {
    // Get create ticket page
    getCreateTicket: (req, res) => {
        res.render('createTicket', { 
            title: 'Create New Ticket',
            user: req.user 
        });
    },
    
    // Create new ticket
    createTicket: async (req, res) => {
        try {
            const { title, description, category, priority } = req.body;
            
            const newTicket = new Ticket({
                title,
                description,
                category,
                priority: priority || 'Medium',
                createdBy: req.user.userId
            });
            
            await newTicket.save();
            
            // Get user details for the notification
            const user = await User.findById(req.user.userId, 'name');
            
            // Get Socket.IO instance
            const io = req.app.get('socketio');
            if (io) {
                // Populate the ticket with creator details
                const populatedTicket = await Ticket.findById(newTicket._id)
                    .populate('createdBy', 'name email');
                
                // Emit to all users viewing the tickets list
                io.to('tickets-list').emit('ticket-created', {
                    ticket: {
                        _id: populatedTicket._id,
                        title: populatedTicket.title,
                        description: populatedTicket.description,
                        category: populatedTicket.category,
                        status: populatedTicket.status,
                        priority: populatedTicket.priority,
                        createdBy: populatedTicket.createdBy,
                        createdAt: populatedTicket.createdAt,
                        updatedAt: populatedTicket.updatedAt
                    },
                    creator: user.name
                });
            }
            
            res.redirect('/tickets');
        } catch (error) {
            console.error('Error creating ticket:', error);
            res.status(500).render('createTicket', {
                title: 'Create New Ticket',
                user: req.user,
                error: 'Error creating ticket. Please try again.'
            });
        }
    },

    // Get all tickets (admin) or user's tickets
    getTickets: async (req, res) => {
        try {
            let tickets = [];
            
            // If admin, get all tickets
            if (req.user.role === 'admin') {
                tickets = await Ticket.find()
                    .populate('createdBy', 'name email')
                    .populate('assignedTo', 'name')
                    .sort({ createdAt: -1 });
            } else {
                // For regular users, get only their tickets
                tickets = await Ticket.find({ createdBy: req.user.userId })
                    .populate('assignedTo', 'name')
                    .sort({ createdAt: -1 });
            }
            
            console.log("Tickets found:", tickets.length); // Add logging
            
            res.render('tickets', {
                title: 'Tickets',
                user: req.user,
                tickets: tickets || [] // Ensure tickets is always an array
            });
        } catch (error) {
            console.error('Error fetching tickets:', error);
            // Render the error page with more details
            res.status(500).render('error', {
                title: 'Error',
                user: req.user,
                message: 'Error fetching tickets: ' + error.message
            });
        }
    },

    // Get single ticket
    getTicket: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const ticket = await Ticket.findById(ticketId)
                .populate('createdBy', 'name email')
                .populate('assignedTo', 'name email')
                .populate('responses.createdBy', 'name role');
            
            // Check if ticket exists
            if (!ticket) {
                return res.status(404).render('error', {
                    title: 'Not Found',
                    user: req.user,
                    message: 'Ticket not found'
                });
            }
            
            // Check if user has permission to view this ticket
            if (req.user.role !== 'admin' && ticket.createdBy._id.toString() !== req.user.userId) {
                return res.status(403).render('error', {
                    title: 'Access Denied',
                    user: req.user,
                    message: 'You do not have permission to view this ticket'
                });
            }
            
            // If admin, get all users for assignment dropdown
            let users = [];
            if (req.user.role === 'admin') {
                users = await User.find({}, 'name email role');
            }
            
            res.render('ticket-details', {
                title: 'Ticket Details',
                user: req.user,
                ticket,
                users
            });
        } catch (error) {
            console.error('Error fetching ticket:', error);
            res.status(500).render('error', {
                title: 'Error',
                user: req.user,
                message: 'Error fetching ticket details. Please try again.'
            });
        }
    },

    // Add response to ticket using Socket.IO
    addResponse: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { text } = req.body;
            
            const ticket = await Ticket.findById(ticketId);
            
            // Check if ticket exists
            if (!ticket) {
                if (req.headers['content-type'] === 'application/json') {
                    return res.status(404).json({ success: false, message: 'Ticket not found' });
                }
                return res.status(404).render('error', {
                    title: 'Not Found',
                    user: req.user,
                    message: 'Ticket not found'
                });
            }
            
            // Check if user has permission
            if (req.user.role !== 'admin' && ticket.createdBy.toString() !== req.user.userId) {
                if (req.headers['content-type'] === 'application/json') {
                    return res.status(403).json({ success: false, message: 'Permission denied' });
                }
                return res.status(403).render('error', {
                    title: 'Access Denied',
                    user: req.user,
                    message: 'You do not have permission to respond to this ticket'
                });
            }
            
            // Add response
            const newResponse = {
                text,
                createdBy: req.user.userId
            };
            
            ticket.responses.push(newResponse);
            
            // Update ticket
            ticket.updatedAt = Date.now();
            
            await ticket.save();
            
            // Get the Socket.IO instance
            const io = req.app.get('socketio');
            if (io) {
                // Emit to ALL clients in the room
                io.to(`ticket-${ticketId}`).emit('response-received', {
                    ticketId,
                    text,
                    userName: req.user.name,
                    isAdmin: req.user.role === 'admin',
                    timestamp: Date.now()
                });
            }
            
            // Check if this is an AJAX request or regular form submission
            if (req.headers['content-type'] === 'application/json') {
                return res.json({ success: true });
            } else {
                return res.redirect(`/tickets/${ticketId}`);
            }
        } catch (error) {
            console.error('Error adding response:', error);
            if (req.headers['content-type'] === 'application/json') {
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            return res.status(500).render('error', {
                title: 'Error',
                user: req.user,
                message: 'Error adding response. Please try again.'
            });
        }
    },

    // Update ticket (admin only)
    updateTicket: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { status, priority, assignedTo } = req.body;
            
            // Only admins can update ticket status/priority/assignment
            if (req.user.role !== 'admin') {
                if (req.headers['content-type'] === 'application/json' || req.xhr) {
                    return res.status(403).json({ success: false, message: 'Admin access required' });
                }
                return res.status(403).render('error', {
                    title: 'Access Denied',
                    user: req.user,
                    message: 'You do not have permission to update this ticket'
                });
            }
            
            const ticket = await Ticket.findById(ticketId);
            
            // Check if ticket exists
            if (!ticket) {
                if (req.headers['content-type'] === 'application/json' || req.xhr) {
                    return res.status(404).json({ success: false, message: 'Ticket not found' });
                }
                return res.status(404).render('error', {
                    title: 'Not Found',
                    user: req.user,
                    message: 'Ticket not found'
                });
            }
            
            // Track changes for notification
            const changes = {};
            
            // Update ticket fields
            if (status && status !== ticket.status) {
                changes.status = { old: ticket.status, new: status };
                ticket.status = status;
            }
            
            if (priority && priority !== ticket.priority) {
                changes.priority = { old: ticket.priority, new: priority };
                ticket.priority = priority;
            }
            
            let assignedToUser = null;
            if (assignedTo !== undefined) {
                // If assignedTo is empty string, set to null (unassigned)
                const newAssignedTo = assignedTo || null;
                const oldAssignedTo = ticket.assignedTo ? ticket.assignedTo.toString() : null;
                
                if (newAssignedTo !== oldAssignedTo) {
                    changes.assignedTo = { 
                        old: oldAssignedTo,
                        new: newAssignedTo
                    };
                    ticket.assignedTo = newAssignedTo;
                    
                    // Get assigned user info for real-time notification
                    if (newAssignedTo) {
                        assignedToUser = await User.findById(newAssignedTo, 'name');
                    }
                }
            }
            
            ticket.updatedAt = Date.now();
            await ticket.save();
            
            // Get Socket.IO instance and emit update if there are changes
            if (Object.keys(changes).length > 0) {
                const io = req.app.get('socketio');
                if (io) {
                    // Send to ticket detail viewers
                    io.to(`ticket-${ticketId}`).emit('ticket-updated', {
                        ticketId,
                        status: ticket.status,
                        statusChanged: changes.status !== undefined,
                        priority: ticket.priority,
                        priorityChanged: changes.priority !== undefined,
                        assignedTo: assignedToUser ? assignedToUser.name : 'Unassigned',
                        assignedToChanged: changes.assignedTo !== undefined,
                        updatedAt: ticket.updatedAt,
                        updatedBy: req.user.name
                    });
                    
                    // Also emit to tickets list viewers
                    io.to('tickets-list').emit('ticket-list-updated', {
                        ticketId,
                        status: ticket.status,
                        priority: ticket.priority,
                        assignedTo: assignedToUser ? assignedToUser.name : 'Unassigned',
                        updatedAt: ticket.updatedAt,
                        updatedBy: req.user.name
                    });
                }
            }
            
            // Check if this is an AJAX request
            if (
                req.xhr || 
                req.headers.accept?.includes('application/json') ||
                req.headers['x-requested-with'] === 'XMLHttpRequest'
            ) {
                return res.json({ success: true });
            } else {
                return res.redirect(`/tickets/${ticketId}`);
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            return res.status(500).render('error', {
                title: 'Error',
                user: req.user,
                message: 'Error updating ticket. Please try again.'
            });
        }
    }
};

module.exports = ticketController;