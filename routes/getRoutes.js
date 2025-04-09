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
        
        // Get staff performance stats
        const supportStaff = await User.find({ 
            role: { $in: ['1st-line', '2nd-line'] } 
        }).select('name role ticketsAssigned ticketsResolved');
        
        // Get status distribution percentages
        const statusDistribution = {
            open: Math.round((openTickets / totalTickets) * 100) || 0,
            inProgress: Math.round((inProgressTickets / totalTickets) * 100) || 0,
            resolved: Math.round((resolvedTickets / totalTickets) * 100) || 0,
            closed: Math.round((closedTickets / totalTickets) * 100) || 0
        };
        
        // Get category distribution
        const categories = ['Hardware', 'Software', 'Network', 'Account', 'Other'];
        const categoryDistribution = {};
        
        for (const category of categories) {
            const count = await Ticket.countDocuments({ category });
            categoryDistribution[category.toLowerCase()] = Math.round((count / totalTickets) * 100) || 0;
        }
        
        // Get high priority tickets
        const criticalTickets = await Ticket.find({ 
            priority: { $in: ['High', 'Critical'] },
            status: { $ne: 'Resolved' }
        })
        .populate('createdBy', 'name')
        .sort({ priority: -1, createdAt: -1 })
        .limit(5);
        
        // Get recent activity
        const recentTickets = await Ticket.find()
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('createdBy', 'name');
            
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
        const recentActivity = [];
        
        // Add recent tickets
        recentTickets.forEach(ticket => {
            // Add null check for createdBy
            const creatorName = ticket.createdBy ? ticket.createdBy.name : 'Unknown User';
            
            recentActivity.push({
                type: 'created',
                text: `${creatorName} created ticket "${ticket.title}"`,
                time: new Date(ticket.createdAt).toLocaleString(),
                ticketId: ticket._id
            });
        });
        
        // Add recent responses
        recentResponses.forEach(item => {
            // Add null check
            const userName = item.responseUser && item.responseUser[0] ? item.responseUser[0].name : 'Unknown User';
            
            recentActivity.push({
                type: 'response',
                text: `${userName} responded to ticket "${item.title}"`,
                time: new Date(item.responses.createdAt).toLocaleString(),
                ticketId: item._id
            });
        });
        
        // Sort by time
        recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
        
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
            statusDistribution,
            categoryDistribution,
            criticalTickets,
            recentActivity: recentActivity.slice(0, 5)
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