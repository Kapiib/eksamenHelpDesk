const Ticket = require('../models/Ticket');
const User = require('../models/User');
const path = require('path'); // Added for file handling

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
            
            // If admin or support staff, get all tickets
            if (req.user.role === 'admin' || req.user.role === '1st-line' || req.user.role === '2nd-line') {
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
            const { status, priority, assignedTo, assignedRole } = req.body;
            
            // Allow admin and support staff to update ticket
            if (req.user.role !== 'admin' && req.user.role !== '1st-line' && req.user.role !== '2nd-line') {
                if (req.headers['content-type'] === 'application/json' || req.xhr) {
                    return res.status(403).json({ success: false, message: 'Staff access required' });
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
                
                // If status changed to resolved, update resolvedAt and update user stats
                if (status === 'Resolved' && ticket.assignedTo) {
                    ticket.resolvedAt = Date.now();
                    
                    // Update assigned user's stats
                    await User.findByIdAndUpdate(ticket.assignedTo, {
                        $inc: { ticketsResolved: 1 }
                    });
                }
            }
            
            if (priority && priority !== ticket.priority) {
                changes.priority = { old: ticket.priority, new: priority };
                ticket.priority = priority;
            }
            
            // Handle role assignment
            if (assignedRole && assignedRole !== ticket.assignedRole) {
                changes.assignedRole = { old: ticket.assignedRole, new: assignedRole };
                ticket.assignedRole = assignedRole;
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
                    
                    // If the ticket was previously assigned, decrement that user's count
                    if (oldAssignedTo) {
                        await User.findByIdAndUpdate(oldAssignedTo, {
                            $inc: { ticketsAssigned: -1 }
                        });
                    }
                    
                    // If the ticket is being assigned to someone new, increment their count
                    if (newAssignedTo) {
                        await User.findByIdAndUpdate(newAssignedTo, {
                            $inc: { ticketsAssigned: 1 }
                        });
                        assignedToUser = await User.findById(newAssignedTo, 'name role');
                    }
                    
                    ticket.assignedTo = newAssignedTo;
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