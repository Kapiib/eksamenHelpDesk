const rateLimit = require('express-rate-limit');

// Login rate limiter - 1 attempt per 3 seconds
const loginLimiter = rateLimit({
    windowMs: 2 * 1000, // 3 seconds
    max: 1, // Limit each IP to 1 request per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        return res.status(429).render('login', {
            title: 'Login',
            error: 'Vennligst vent 3 sekunder før du prøver å logge inn igjen'
        });
    }
});

// Register rate limiter - 1 attempt per 3 seconds
const registerLimiter = rateLimit({
    windowMs: 2 * 1000, // 3 seconds
    max: 1, // Limit each IP to 1 request per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        return res.status(429).render('register', {
            title: 'Register',
            error: 'Vennligst vent 3 sekunder før du prøver å registrere deg igjen'
        });
    }
});

// Ticket creation rate limiter - 1 ticket per 3 seconds
const ticketLimiter = rateLimit({
    windowMs: 2 * 1000, // 3 seconds
    max: 1, // Limit each IP to 1 request per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        return res.status(429).render('create-ticket', {
            title: 'Create Ticket',
            user: req.user,
            error: 'Vennligst vent 3 sekunder før du oppretter en ny sak'
        });
    }
});

module.exports = {
    loginLimiter,
    registerLimiter,
    ticketLimiter
};