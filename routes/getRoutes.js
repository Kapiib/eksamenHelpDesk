const express = require("express");
const router = express.Router();
const checkJWT = require('../utils/checkJWT');
const { checkAuth, isAdmin } = require('../utils/checkAuth');
const ticketController = require('../controllers/ticketController');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

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

// admin routes
router.get("/admin/dashboard", checkAuth, isAdmin, (req, res) => {
    res.render('admin-index', { title: 'Admin Dashboard' });
});

router.get("/api/admin/dashboard", checkAuth, isAdmin, async (req, res) => {
    try {
        // Get ticket counts
        const totalTickets = await Ticket.countDocuments();
        const openTickets = await Ticket.countDocuments({ status: 'Open' });
        const inProgressTickets = await Ticket.countDocuments({ status: 'In Progress' });
        const resolvedTickets = await Ticket.countDocuments({ status: 'Resolved' });
        
        // Get status distribution percentages
        const statusDistribution = {
            open: Math.round((openTickets / totalTickets) * 100) || 0,
            inProgress: Math.round((inProgressTickets / totalTickets) * 100) || 0,
            resolved: Math.round((resolvedTickets / totalTickets) * 100) || 0
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
            recentActivity.push({
                type: 'created',
                text: `${ticket.createdBy.name} created ticket "${ticket.title}"`,
                time: new Date(ticket.createdAt).toLocaleString(),
                ticketId: ticket._id
            });
        });
        
        // Add recent responses
        recentResponses.forEach(item => {
            const userName = item.responseUser[0]?.name || 'Unknown';
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
                resolved: resolvedTickets
            },
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

router.get("/api/admin/recent-activity", checkAuth, isAdmin, async (req, res) => {
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