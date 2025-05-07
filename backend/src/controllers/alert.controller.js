// Importation du modèle Alert
const Alert = require('../models/alert.model');

/**
 * Crée une nouvelle alerte.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const createAlert = async (req, res) => {
    try {
        // Création d'une nouvelle alerte à partir des données de la requête
        const alert = new Alert(req.body);
        // Sauvegarde de l'alerte dans la base de données
        await alert.save();
        // Envoi de la réponse avec l'alerte créée
        res.status(201).send(alert);
    } catch (error) {
        // Gestion des erreurs et envoi d'une réponse d'erreur
        res.status(400).send(error);
    }
};

/**
 * Récupère toutes les alertes.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getAlerts = async (req, res) => {
    try {
        // Récupération de toutes les alertes triées par date de création décroissante
        const alerts = await Alert.find().sort({ createdAt: -1 });
        // Envoi de la réponse avec les alertes
        res.send(alerts);
    } catch (error) {
        // Gestion des erreurs et envoi d'une réponse d'erreur
        res.status(500).send(error);
    }
};

/**
 * Récupère les alertes actives.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getActiveAlerts = async (req, res) => {
    try {
        // Récupération des alertes actives en utilisant une méthode personnalisée du modèle
        const alerts = await Alert.findActive();
        // Envoi de la réponse avec les alertes actives
        res.send(alerts);
    } catch (error) {
        // Gestion des erreurs et envoi d'une réponse d'erreur
        res.status(500).send(error);
    }
};

/**
 * Récupère les alertes critiques.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getCriticalAlerts = async (req, res) => {
    try {
        // Récupération des alertes critiques en utilisant une méthode personnalisée du modèle
        const alerts = await Alert.findCritical();
        // Envoi de la réponse avec les alertes critiques
        res.send(alerts);
    } catch (error) {
        // Gestion des erreurs et envoi d'une réponse d'erreur
        res.status(500).send(error);
    }
};

/**
 * Acquitte une alerte.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const acknowledgeAlert = async (req, res) => {
    try {
        // Recherche de l'alerte par son ID
        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            // Si l'alerte n'est pas trouvée, envoi d'une réponse d'erreur
            return res.status(404).send({ error: 'Alert not found' });
        }
        // Acquittement de l'alerte avec l'ID de l'utilisateur
        await alert.acknowledge(req.user._id);
        // Envoi de la réponse avec l'alerte acquittée
        res.send(alert);
    } catch (error) {
        // Gestion des erreurs et envoi d'une réponse d'erreur
        res.status(500).send(error);
    }
};

/**
 * Résout une alerte.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const resolveAlert = async (req, res) => {
    try {
        // Recherche de l'alerte par son ID
        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            // Si l'alerte n'est pas trouvée, envoi d'une réponse d'erreur
            return res.status(404).send({ error: 'Alert not found' });
        }
        // Résolution de l'alerte avec l'ID de l'utilisateur
        await alert.resolve(req.user._id);
        // Envoi de la réponse avec l'alerte résolue
        res.send(alert);
    } catch (error) {
        // Gestion des erreurs et envoi d'une réponse d'erreur
        res.status(500).send(error);
    }
};

/**
 * Ajoute une action à une alerte.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const addActionToAlert = async (req, res) => {
    try {
        // Recherche de l'alerte par son ID
        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            // Si l'alerte n'est pas trouvée, envoi d'une réponse d'erreur
            return res.status(404).send({ error: 'Alert not found' });
        }
        // Ajout d'une action à l'alerte avec les données de la requête et l'ID de l'utilisateur
        await alert.addAction(req.body, req.user._id);
        // Envoi de la réponse avec l'alerte mise à jour
        res.send(alert);
    } catch (error) {
        // Gestion des erreurs et envoi d'une réponse d'erreur
        res.status(500).send(error);
    }
};

// Exportation des fonctions du contrôleur
module.exports = {
    createAlert,
    getAlerts,
    getActiveAlerts,
    getCriticalAlerts,
    acknowledgeAlert,
    resolveAlert,
    addActionToAlert
};
