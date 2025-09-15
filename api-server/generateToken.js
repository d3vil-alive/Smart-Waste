// generateToken.js
const jwt = require('jsonwebtoken');

const payload = {
    userId: 'nkalam',     // unique identifier for the user
    userType: 'admin'       // ✅ changed to match middleware authorizeRoles('admin')
};

const secret = "cArxsIr4y2uga3SdQobROuzBjcQQVwaGAWZvTyK2nM4="; // from .env
const token = jwt.sign(payload, secret, { expiresIn: '24h' });

console.log(token);
