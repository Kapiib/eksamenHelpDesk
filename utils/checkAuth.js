const { verifyToken } = require("./jwtUtils.js");

const checkAuth = (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
        return res.redirect("/auth/login");
    }

    const decodedToken = verifyToken(token);

    if (!decodedToken) {
        res.clearCookie("jwt");
        return res.redirect("/auth/login");
    }

    req.user = decodedToken;
    next();
};

// Update isAdmin to isStaff to allow support roles access
const isStaff = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === '1st-line' || req.user.role === '2nd-line')) {
        return next();
    }
    return res.status(403).render('error', { 
        title: 'Access Denied', 
        message: 'Staff access required' 
    });
};

// Keep a separate admin-only check for role management and critical actions
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).render('error', { 
        title: 'Access Denied', 
        message: 'Admin access required' 
    });
};

module.exports = { checkAuth, isStaff, isAdmin };
