// src/middlewares/admin.middleware.js
const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send({ error: 'Accès refusé. Droits administrateur requis.' });
    }
    next();
};

module.exports = adminAuth;