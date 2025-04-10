const User = require('../models/User');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const { createToken } = require('../utils/jwtUtils');

const authController = {
    register: async (req, res) => {
        try {
            const { name, email, password, confirmPassword } = req.body;
            
            if (password !== confirmPassword) {
                return res.status(400).render('register', {
                    title: 'Register',
                    error: 'Passwords do not match',
                });
            }
            
            if (password.length < 3) {
                return res.status(400).render('register', {
                    title: 'Register',
                    error: 'Password must be at least 3 characters',
                });
            }
            
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.render('register', {
                    title: 'Register',
                    error: 'User already exists'
                });
            }
            
            // argon2 to hash password
            const hashedPassword = await argon2.hash(password);
            
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
            });
            
            await newUser.save();
            
            res.redirect('/auth/login');
            
        } catch (error) {
            console.error(error);
            res.status(500).render('register', {
                title: 'Register',
                error: 'Server error, please try again',
            });
        }
    },
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            const user = await User.findOne({ email });
            if (!user) {
                return res.render('login', {
                    title: 'Login',
                    error: 'Invalid email address'
                });
            }
            
            // Using argon2 instead of bcrypt
            const isMatch = await argon2.verify(user.password, password);
            if (!isMatch) {
                return res.render('login', {
                    title: 'Login',
                    error: 'Incorrect password'
                });
            }
            
            const payload = {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }

            const token = createToken(payload);

            res.cookie('jwt', token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });
            
            // Redirect based on user role
            if (user.role === 'admin' || user.role === '1st-line' || user.role === '2nd-line') {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/profile');
            }
            
        } catch (error) {
            console.error(error);
            res.status(500).render('login', {
                title: 'Login',
                error: 'Server error, please try again'
            });
        }
    },
    logout: (req, res) => {
        res.clearCookie('jwt');
        return res.redirect("/");
    }
}

module.exports = authController;
