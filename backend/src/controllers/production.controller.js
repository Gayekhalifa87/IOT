// Importation des modèles Production et History
const Production = require('../models/production.model');
const History = require('../models/history.model');
const { logAction } = require('../services/historyService');

/**
 * Ajoute une nouvelle production.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const addProduction = async (req, res) => {
    try {
        // Création d'un nouvel objet Production avec userId
        const production = new Production({
            userId: req.user._id, // Ajout du userId de l'utilisateur connecté
            ...req.body
        });
        await production.save();

        // Enregistrer l'action dans l'historique
        await logAction(req.user._id, 'production', 'production_added', 
            `Production ajoutée: ${production.chickenCount} poulets`, {
                productionId: production._id,
                chickenCount: production.chickenCount,
            });

        res.status(201).send(production);
    } catch (error) {
        console.error('Error in addProduction:', error);
        res.status(400).send({ error: error.message || 'Error adding production' });
    }
};

/**
 * Récupère les statistiques de production pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getProductionStats = async (req, res) => {
    try {
        const stats = await Production.aggregate([
            { $match: { userId: req.user._id } }, // Filtrer par userId
            {
                $group: {
                    _id: null,
                    totalChickens: { $sum: '$chickenCount' },
                    totalMortality: { $sum: '$mortality' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalChickens: 1,
                    totalMortality: 1
                }
            }
        ]);

        await logAction(req.user._id, 'production', 'production_stats_viewed', 
            'Consultation des statistiques de production', { stats });

        res.send(stats[0] || { totalChickens: 0, totalMortality: 0 }); // Retourne 0 si pas de données
    } catch (error) {
        console.error('Error in getProductionStats:', error);
        res.status(500).send({ error: error.message || 'Error retrieving production stats' });
    }
};

/**
 * Met à jour une production existante (seulement si elle appartient à l'utilisateur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const updateProduction = async (req, res) => {
    try {
        const production = await Production.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id }, // Vérifier l'appartenance
            req.body,
            { new: true, runValidators: true }
        );

        if (!production) {
            return res.status(404).send({ error: 'Production not found or not authorized' });
        }

        await logAction(req.user._id, 'production', 'production_updated', 
            `Production mise à jour: ${production.chickenCount} poulets`, {
                productionId: production._id,
                chickenCount: production.chickenCount,
            });

        res.send(production);
    } catch (error) {
        console.error('Error in updateProduction:', error);
        res.status(400).send({ error: error.message || 'Error updating production' });
    }
};

/**
 * Supprime une production (seulement si elle appartient à l'utilisateur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const deleteProduction = async (req, res) => {
    try {
        const production = await Production.findOneAndDelete(
            { _id: req.params.id, userId: req.user._id } // Vérifier l'appartenance
        );

        if (!production) {
            return res.status(404).send({ error: 'Production not found or not authorized' });
        }

        await logAction(req.user._id, 'production', 'production_deleted', 
            `Production supprimée: ${production.chickenCount} poulets`, {
                productionId: production._id,
                chickenCount: production.chickenCount,
            });

        res.send(production);
    } catch (error) {
        console.error('Error in deleteProduction:', error);
        res.status(500).send({ error: error.message || 'Error deleting production' });
    }
};

/**
 * Récupère toutes les productions de l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getAllProductions = async (req, res) => {
    try {
        const productions = await Production.find({ userId: req.user._id });

        await logAction(req.user._id, 'production', 'all_productions_viewed', 
            'Consultation de toutes les productions');

        res.send(productions);
    } catch (error) {
        console.error('Error in getAllProductions:', error);
        res.status(500).send({ error: error.message || 'Error retrieving all productions' });
    }
};

// Exportation des fonctions du contrôleur
module.exports = {
    addProduction,
    getProductionStats,
    updateProduction,
    deleteProduction,
    getAllProductions
};