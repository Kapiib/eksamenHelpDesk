const Ticket = require('../models/Ticket');
const User = require('../models/User');
const path = require('path');

const ticketController = {
    getCreateTicket: (req, res) => {
        res.render('createTicket', { 
            title: 'Create Ticket',
            user: req.user 
        });
    },
    
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
            
            const user = await User.findById(req.user.userId, 'name');
            
            const io = req.app.get('socketio');
            if (io) {
                const populatedTicket = await Ticket.findById(newTicket._id)
                    .populate('createdBy', 'name email');
                
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
                title: 'Create Ticket',
                user: req.user,
                error: 'Error creating ticket. Please try again.' // Changed from Norwegian
            });
        }
    },

    getTickets: async (req, res) => {
        try {
            let query = {};
            
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
                tickets: tickets || []
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

    getTicket: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const ticket = await Ticket.findById(ticketId)
                .populate('createdBy', 'name email')
                .populate('assignedTo', 'name email')
                .populate('responses.createdBy', 'name role');
            
            if (!ticket) {
                return res.status(404).render('error', {
                    title: 'Not Found',
                    user: req.user,
                    message: 'Ticket not found'
                });
            }
            
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

    addResponse: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { text } = req.body;
            let fileUrl = null;
            let fileType = null;
            
            if (req.files && req.files.file) {
                const file = req.files.file;
                
                const fileName = `${Date.now()}-${file.name}`;
                const uploadPath = path.join(__dirname, '../public/uploads/', fileName);
                
                await file.mv(uploadPath);
                
                fileUrl = `/uploads/${fileName}`;
                fileType = file.mimetype;
            }
            
            const ticket = await Ticket.findById(ticketId);
            
            if (!ticket) {
                return res.status(404).json({ success: false, message: 'Ticket not found' });
            }
            
            if (req.user.role !== 'admin' && ticket.createdBy.toString() !== req.user.userId) {
                return res.status(403).json({ success: false, message: 'Permission denied' });
            }
            
            const newResponse = {
                text,
                fileUrl,
                fileType,
                createdBy: req.user.userId
            };
            
            ticket.responses.push(newResponse);
            
            ticket.updatedAt = Date.now();
            
            await ticket.save();
            
            const io = req.app.get('socketio');
            if (io) {
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

    updateTicket: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { status, priority, assignedRole, assignedTo } = req.body;
            
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) {
                return res.status(404).render('error', {
                    title: 'Not Found',
                    message: 'Ticket not found',
                    user: req.user
                });
            }
            
            ticket.status = status;
            ticket.priority = priority;
            
            if (req.user.role === 'admin') {
                if (assignedRole) {
                    ticket.assignedRole = assignedRole;
                }
                
                if (assignedTo) {
                    ticket.assignedTo = assignedTo;
                    
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
            
            if (!ticket.activities) {
                ticket.activities = [];
            }

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

    assignTicket: async (req, res) => {
        try {
            const ticketId = req.params.id;
            const { assignedTo } = req.body;
            
            await Ticket.findByIdAndUpdate(ticketId, {
                assignedTo,
                updatedAt: new Date()
            });
                        
            res.json({ success: true });
        } catch (error) {
            console.error('Error assigning ticket:', error);
            res.status(500).json({ success: false, message: 'Error assigning ticket' });
        }
    }
};

module.exports = ticketController;