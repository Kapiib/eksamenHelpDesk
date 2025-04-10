const User = require('../models/User');
const Ticket = require('../models/Ticket');

const adminController = {
    getUsers: async (req, res) => {
        try {
            const users = await User.find().select('-password');
            
            res.render('admin-users', {
                title: 'User Management',
                user: req.user,
                users
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).render('error', {
                title: 'Error',
                user: req.user,
                message: 'Error fetching users. Please try again.'
            });
        }
    },
    
    updateUserRole: async (req, res) => {
        try {
            const userId = req.params.id;
            const { role } = req.body;
            
            if (role === 'admin') {
                return res.status(403).render('error', {
                    title: 'Action Denied',
                    user: req.user,
                    message: 'Admin role cannot be assigned through this interface.'
                });
            }
            
            const validRoles = ['user', 'admin', '1st-line', '2nd-line'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ success: false, message: 'Invalid role' });
            }
            
            await User.findByIdAndUpdate(userId, { role });
            
            res.redirect('/admin/users');
        } catch (error) {
            console.error('Error updating user role:', error);
            res.status(500).render('error', {
                title: 'Error',
                user: req.user,
                message: 'Error updating user role. Please try again.'
            });
        }
    },
    
    getDashboard: async (req, res) => {
        try {
            res.render('admin-index', { 
                title: 'Admin Dashboard',
                user: req.user
            });
        } catch (error) {
            console.error('Error loading dashboard:', error);
            res.status(500).render('error', {
                title: 'Error',
                user: req.user,
                message: 'Error loading dashboard. Please try again.'
            });
        }
    }
};

module.exports = adminController;