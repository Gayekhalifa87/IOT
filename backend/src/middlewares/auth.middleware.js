const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const BlacklistedToken = require('../models/blacklistedToken');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).send({ message: 'Authentification requise' });
        }

        // Vérifier si le token est blacklisté
        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).send({ message: 'Veuillez vous connecter s\'il vous plait !' });
        }

        // Vérifier la validité du token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id);

        if (!user) {
            throw new Error();
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Erreur d\'authentification:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).send({ message: 'Session expirée' });
        }

        return res.status(401).send({ message: 'Authentification invalide' });
    }
};

module.exports = authMiddleware;
