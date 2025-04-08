const jwt = require("jsonwebtoken");

const createToken = (payload) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
};

const verifyToken = (token) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        console.log("JWT Verification Error", error);
        return null;
    }
};

module.exports = { createToken, verifyToken };
