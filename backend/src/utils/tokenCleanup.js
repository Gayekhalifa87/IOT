const cron = require('node-cron');
const BlacklistedToken = require('../models/blacklistedToken');

// Fonction pour nettoyer manuellement les tokens expirés
const cleanupExpiredTokens = async () => {
    try {
        const now = new Date();
        const result = await BlacklistedToken.deleteMany({ expiresAt: { $lt: now } });
        console.log(`Nettoyage des tokens: ${result.deletedCount} tokens supprimés`);
    } catch (error) {
        console.error('Erreur lors du nettoyage des tokens:', error);
    }
};

// Planifier le nettoyage tous les jours à minuit
const scheduledCleanup = () => {
    cron.schedule('0 0 * * *', cleanupExpiredTokens);
    console.log('Nettoyage programmé des tokens blacklistés');
};

module.exports = {
    cleanupExpiredTokens,
    scheduledCleanup
};