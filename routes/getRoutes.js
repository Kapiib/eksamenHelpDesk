const express = require("express");
const router = express.Router();
const checkJWT = require('../utils/checkJWT');
const { checkAuth, isStaff, isAdmin } = require('../utils/checkAuth');
const ticketController = require('../controllers/ticketController');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const adminController = require('../controllers/adminController');

// public routes
router.get("/", (req, res) => {
    res.render('index', { title: 'Dashboard' });
});

router.get("/auth/register", (req, res) => {
    res.render('register', { title: 'Register' });
});

router.get("/auth/login", (req, res) => {
    res.render('login', { title: 'Login' });
});

// FAQ page
router.get("/faq", (req, res) => {
    res.render("faq", {
        title: "FAQ",
        user: req.user
    });
});

// private routes
router.get("/tickets", checkAuth, ticketController.getTickets);
router.get("/tickets/create", checkAuth, ticketController.getCreateTicket);
router.get("/tickets/:id", checkAuth, ticketController.getTicket);

router.get("/profile", checkAuth, (req, res) => {
    res.render('profile', { 
        title: 'Your Profile',
        user: req.user
    });
});

// User manual route - accessible to all logged in users
router.get("/manual", checkAuth, (req, res) => {
    res.render('manual', { 
        title: 'Brukermanual',
        user: req.user
    });
});

// admin routes
router.get("/admin/dashboard", checkAuth, isStaff, adminController.getDashboard);

// Keep admin-only routes for role management
router.get("/admin/users", checkAuth, isAdmin, adminController.getUsers);
router.post("/admin/users/:id/update-role", checkAuth, isAdmin, adminController.updateUserRole);

// Update dashboard API to allow support staff access
router.get("/api/admin/dashboard", checkAuth, isStaff, async (req, res) => {
    try {
        // Get ticket counts
        const totalTickets = await Ticket.countDocuments();
        const openTickets = await Ticket.countDocuments({ status: 'Open' });
        const inProgressTickets = await Ticket.countDocuments({ status: 'In Progress' });
        const resolvedTickets = await Ticket.countDocuments({ status: 'Resolved' });
        const closedTickets = await Ticket.countDocuments({ status: 'Closed' });
        
        // Get role statistics
        const roleStats = {
            '1st-line': {
                total: await Ticket.countDocuments({ assignedRole: '1st-line' }),
                open: await Ticket.countDocuments({ assignedRole: '1st-line', status: 'Open' }),
                inProgress: await Ticket.countDocuments({ assignedRole: '1st-line', status: 'In Progress' }),
                resolved: await Ticket.countDocuments({ assignedRole: '1st-line', status: 'Resolved' }),
                closed: await Ticket.countDocuments({ assignedRole: '1st-line', status: 'Closed' })
            },
            '2nd-line': {
                total: await Ticket.countDocuments({ assignedRole: '2nd-line' }),
                open: await Ticket.countDocuments({ assignedRole: '2nd-line', status: 'Open' }),
                inProgress: await Ticket.countDocuments({ assignedRole: '2nd-line', status: 'In Progress' }),
                resolved: await Ticket.countDocuments({ assignedRole: '2nd-line', status: 'Resolved' }),
                closed: await Ticket.countDocuments({ assignedRole: '2nd-line', status: 'Closed' })
            },
            unassigned: {
                total: await Ticket.countDocuments({ assignedRole: 'unassigned' }),
                open: await Ticket.countDocuments({ assignedRole: 'unassigned', status: 'Open' }),
                inProgress: await Ticket.countDocuments({ assignedRole: 'unassigned', status: 'In Progress' }),
                resolved: await Ticket.countDocuments({ assignedRole: 'unassigned', status: 'Resolved' }),
                closed: await Ticket.countDocuments({ assignedRole: 'unassigned', status: 'Closed' })
            }
        };
        
        // Replace the supportStaff section with this more dynamic approach

        // Get staff performance stats - only for admin
        let supportStaff = [];
        if (req.user.role === 'admin') {
            // First, get all support staff users
            const staffUsers = await User.find({ 
                role: { $in: ['1st-line', '2nd-line'] } 
            }).select('name role _id');
            
            // For each staff member, calculate their ticket stats directly from the tickets collection
            supportStaff = await Promise.all(staffUsers.map(async (staff) => {
                // Count tickets assigned to this staff member
                const ticketsAssigned = await Ticket.countDocuments({ 
                    assignedTo: staff._id 
                });
                
                // Count resolved tickets
                const ticketsResolved = await Ticket.countDocuments({ 
                    assignedTo: staff._id,
                    status: 'Resolved'
                });
                
                // Count closed tickets
                const ticketsClosed = await Ticket.countDocuments({ 
                    assignedTo: staff._id,
                    status: 'Closed'
                });
                
                // Return user with calculated stats
                return {
                    _id: staff._id,
                    name: staff.name,
                    role: staff.role,
                    ticketsAssigned,
                    ticketsResolved,
                    ticketsClosed
                };
            }));
        }

        // Get assigned tickets - for support staff
        let assignedTickets = [];
        if (req.user.role === '1st-line' || req.user.role === '2nd-line') {
            // Import mongoose and use new keyword with ObjectId constructor
            const mongoose = require('mongoose');
            const ObjectId = mongoose.Types.ObjectId;
            
            try {
                console.log('Finding tickets assigned to:', req.user.userId);
                
                // Use 'new' with ObjectId constructor
                assignedTickets = await Ticket.find({ 
                    assignedTo: new ObjectId(req.user.userId)
                })
                .populate('createdBy', 'name')
                .sort({ priority: -1, updatedAt: -1 })
                .limit(10);
                
                console.log('Found assigned tickets:', assignedTickets.length);
            } catch (err) {
                console.error('Error fetching assigned tickets:', err);
                // Don't throw error, just return empty array
                assignedTickets = [];
            }
        }
        
        // Get status distribution
        const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        const statusDistribution = {};
        
        for (const status of statuses) {
            const count = await Ticket.countDocuments({ status });
            statusDistribution[status.toLowerCase().replace(' ', '-')] = Math.round((count / totalTickets) * 100) || 0;
        }
        
        // Get category distribution
        const categories = ['Hardware', 'Software', 'Network', 'Account', 'Other'];
        const categoryDistribution = {};
        
        for (const category of categories) {
            const count = await Ticket.countDocuments({ category });
            categoryDistribution[category.toLowerCase()] = Math.round((count / totalTickets) * 100) || 0;
        }
        
        // Get critical tickets
        const criticalTickets = await Ticket.find({ 
            priority: 'Critical',
            status: { $in: ['Open', 'In Progress'] }
        })
        .populate('createdBy', 'name')
        .sort({ updatedAt: -1 })
        .limit(5);
        
        // REPLACE TicketActivity with direct ticket queries for recent activity
        // Get recent activity from tickets directly
        const recentTickets = await Ticket.find()
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('createdBy', 'name');
        
        // Get recent responses using aggregation
        const recentResponses = await Ticket.aggregate([
            { $unwind: '$responses' },
            { $sort: { 'responses.createdAt': -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'responses.createdBy',
                    foreignField: '_id',
                    as: 'responseUser'
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    'responses.text': 1,
                    'responses.createdAt': 1,
                    'responseUser.name': 1
                }
            }
        ]);
        
        // Format recent activity
        const recentActivityFormatted = [];
        
        // Add recent tickets
        recentTickets.forEach(ticket => {
            const creatorName = ticket.createdBy ? ticket.createdBy.name : 'Unknown User';
            
            recentActivityFormatted.push({
                type: 'created',
                text: `${creatorName} created ticket "${ticket.title}"`,
                time: new Date(ticket.createdAt).toLocaleString(),
                ticketId: ticket._id
            });
        });
        
        // Add recent responses
        recentResponses.forEach(item => {
            const userName = item.responseUser && item.responseUser[0] ? item.responseUser[0].name : 'Unknown User';
            
            recentActivityFormatted.push({
                type: 'response',
                text: `${userName} responded to ticket "${item.title}"`,
                time: new Date(item.responses.createdAt).toLocaleString(),
                ticketId: item._id
            });
        });
        
        // Sort by time
        recentActivityFormatted.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        // Return data
        res.json({
            stats: {
                total: totalTickets,
                open: openTickets,
                inProgress: inProgressTickets,
                resolved: resolvedTickets,
                closed: closedTickets
            },
            roleStats,
            supportStaff,
            assignedTickets,
            statusDistribution,
            categoryDistribution,
            criticalTickets,
            recentActivity: recentActivityFormatted.slice(0, 5)
        });
    } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get("/api/admin/recent-activity", checkAuth, isStaff, async (req, res) => {
    try {
        // Get recent activity (simplified version)
        const recentTickets = await Ticket.find()
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('createdBy', 'name');
            
        const recentActivity = recentTickets.map(ticket => ({
            type: 'created',
            text: `${ticket.createdBy.name} created ticket "${ticket.title}"`,
            time: new Date(ticket.createdAt).toLocaleString(),
            ticketId: ticket._id
        }));
        
        res.json(recentActivity);
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;