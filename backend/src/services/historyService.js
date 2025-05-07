const History = require('../models/history.model');

/**
 * Enregistre une action dans l'historique.
 * @param {string} userId - L'ID de l'utilisateur qui effectue l'action.
 * @param {string} type - Le type d'action (ex: 'login', 'register', 'updatePassword').
 * @param {string} action - L'action spécifique (ex: 'user_logged_in', 'password_updated').
 * @param {string} description - Une description de l'action.
 * @param {Object} data - Les données supplémentaires liées à l'action.
 */
const logAction = async (userId, type, action, description, data = {}) => {
    try {
        // Utiliser l'heure actuelle du système
        const currentTime = new Date();

        // Ajouter les informations système
        const systemInfo = {
            timestamp: currentTime, // Heure actuelle
            user: 'Antoine627', // Peut-être dynamiser avec userId ou req.user plus tard
            ...data
        };

        const historyEntry = new History({
            userId,
            type,
            action,
            description,
            data: systemInfo,
            createdAt: currentTime, // Heure actuelle
            createdBy: 'Antoine627' // Peut-être dynamiser aussi
        });

        const savedEntry = await historyEntry.save();
        console.log(`Action enregistrée dans l'historique: ${action}`, savedEntry);
        return savedEntry;
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de l\'action dans l\'historique:', error);
        throw error; // Propager l'erreur pour la gestion dans le contrôleur
    }
};

module.exports = {
    logAction,
};