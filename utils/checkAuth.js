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

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).render('error', { 
        title: 'Access Denied', 
        message: 'Admin access required' 
    });
};

module.exports = { checkAuth, isAdmin };
