const Ticket = require('../models/Ticket');
const User = require('../models/User');
const path = require('path'); // Added for file handling

const ticketController = {
    // Get create ticket page
    getCreateTicket: (req, res) => {
        res.render('createTicket', { 
            title: 'Create Ticket', // Changed from 'Opprett ny sak'
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
            
            return res.redirect('/tickets');
        } catch (error) {
            console.error('Error creating ticket:', error);
            res.status(500).render('createTicket', {
                title: 'Create Ticket', // Changed from 'Opprett ny sak'
                user: req.user,
                error: 'Error creating ticket. Please try again.' // Changed from Norwegian
            });
        }
    },

    // Change the getTickets method back to original

    getTickets: async (req, res) => {
        try {
            let query = {};
            
            // Only show user's tickets unless they are admin or support staff
            if (req.user.role !== 'admin' && req.user.role !== '1st-line' && req.user.role !== '2nd-line') {
                query.createdBy = req.user.userId;
            }
            
            let tickets = await Ticket.find(query)
                .populate('createdBy', 'name email')
                .populate('assignedTo', 'name')
                .sort({ updatedAt: -1 });
            
            res.render('tickets', {
                title: 'Tickets',
                user: req.user,
                tickets: tickets || [] // Ensure tickets is always an array
            });
        } catch (error) {
            console.error('Error fetching tickets:', error);
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
            if (req.user.role !== 'admin' && 
                req.user.role !== '1st-line' && 
                req.user.role !== '2nd-line' && 
                (!ticket.createdBy || ticket.createdBy._id.toString() !== req.user.userId)) {
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

    // Add response to ticket using Socket.IO and handle file uploads
    addResponse: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { text } = req.body;
            let fileUrl = null;
            let fileType = null;
            
            // Handle file upload if present
            if (req.files && req.files.file) {
                const file = req.files.file;
                
                // Generate unique filename
                const fileName = `${Date.now()}-${file.name}`;
                const uploadPath = path.join(__dirname, '../public/uploads/', fileName);
                
                // Move file to uploads directory
                await file.mv(uploadPath);
                
                // Set file URL for storage in DB
                fileUrl = `/uploads/${fileName}`;
                fileType = file.mimetype;
            }
            
            const ticket = await Ticket.findById(ticketId);
            
            // Check if ticket exists
            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket not found' });
            }
            
            // Check if user has permission
            if (req.user.role !== 'admin' && ticket.createdBy.toString() !== req.user.userId) {
                return res.status(403).json({ success: false, message: 'Permission denied' });
            }
            
            // Add response
            const newResponse = {
                text,
                fileUrl,
                fileType,
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
                    fileUrl,
                    fileType,
                    userName: req.user.name,
                    isAdmin: req.user.role === 'admin' || req.user.role === '1st-line' || req.user.role === '2nd-line',
                    timestamp: Date.now()
                });
            }
            
            return res.json({ success: true });
        } catch (error) {
            console.error('Error adding response:', error);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    // Update ticket (admin only)
    updateTicket: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { status, priority, assignedRole, assignedTo } = req.body;
            
            // Get the ticket
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) {
                return res.status(404).render('error', {
                    title: 'Not Found',
                    message: 'Ticket not found',
                    user: req.user
                });
            }
            
            // Update fields that any staff can modify
            ticket.status = status;
            ticket.priority = priority;
            
            // Only admins can assign tickets
            if (req.user.role === 'admin') {
                // Update assignment fields
                if (assignedRole) {
                    ticket.assignedRole = assignedRole;
                }
                
                if (assignedTo) {
                    ticket.assignedTo = assignedTo;
                    
                    // If we're assigning to a specific staff member, update their stats
                    if (assignedTo !== ticket.assignedTo) {
                        try {
                            await User.findByIdAndUpdate(assignedTo, {
                                $inc: { ticketsAssigned: 1 }
                            });
                        } catch (err) {
                            console.error('Error updating staff stats:', err);
                        }
                    }
                }
            }
            
            // Add activity record - Initialize activities array if it doesn't exist
            if (!ticket.activities) {
                ticket.activities = [];
            }

            // Change back to English activity message
            ticket.activities.push({
                action: 'update',
                user: req.user.userId,
                message: `Ticket updated by ${req.user.name}`, // Changed from Norwegian
                timestamp: new Date()
            });
            
            await ticket.save();
            
            res.redirect(`/tickets/${ticketId}`);
        } catch (error) {
            console.error('Error updating ticket:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Error updating ticket',
                user: req.user
            });
        }
    },

    // Simplify assignTicket - no need to update User stats
    assignTicket: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { assignedTo } = req.body;
            
            // Just update the ticket
            await Ticket.findByIdAndUpdate(ticketId, {
                assignedTo,
                updatedAt: new Date()
            });
            
            // No need to update user statistics
            
            res.json({ success: true });
        } catch (error) {
            console.error('Error assigning ticket:', error);
            res.status(500).json({ success: false, message: 'Error assigning ticket' });
        }
    }
};

module.exports = ticketController;