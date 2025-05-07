// Importation des modèles Cost et History
const Cost = require('../models/cost.model');
const History = require('../models/history.model');
const { logAction } = require('../services/historyService');

/**
 * Ajoute un nouveau coût.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const addCost = async (req, res) => {
    try {
        const cost = new Cost({
            userId: req.user._id, // Ajout du userId de l'utilisateur connecté
            ...req.body
        });
        await cost.save();

        await logAction(req.user._id, 'cost', 'cost_added', 
            `Coût ajouté: ${cost.amount}€ pour ${cost.type}`, {
                costId: cost._id,
                amount: cost.amount,
                type: cost.type,
            });

        res.status(201).send(cost);
    } catch (error) {
        console.error('Error in addCost:', error);
        res.status(400).send({ error: error.message || 'Error adding cost' });
    }
};

/**
 * Récupère l'historique des coûts pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getCostHistory = async (req, res) => {
    try {
        const { startDate, endDate, limit = 50 } = req.query;
        let query = { userId: req.user._id }; // Filtrer par userId

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const costs = await Cost.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        await logAction(req.user._id, 'cost', 'cost_history_viewed', 
            'Consultation de l\'historique des coûts', {
                startDate,
                endDate,
                limit,
            });

        res.send(costs);
    } catch (error) {
        console.error('Error in getCostHistory:', error);
        res.status(500).send({ error: error.message || 'Error retrieving cost history' });
    }
};

/**
 * Récupère les statistiques des coûts pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getCostStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = { userId: req.user._id };

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const stats = await Cost.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    averageAmount: { $avg: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        await logAction(req.user._id, 'cost', 'cost_stats_viewed', 
            'Consultation des statistiques des coûts', {
                startDate,
                endDate,
            });

        res.send(stats);
    } catch (error) {
        console.error('Error in getCostStats:', error);
        res.status(500).send({ error: error.message || 'Error retrieving cost stats' });
    }
};

/**
 * Calcule tous les coûts pour le bien-être du poulailler pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const calculateTotalCosts = async (req, res) => {
    try {
        const costsByCategory = await Cost.aggregate([
            { $match: { userId: req.user._id } }, // Filtrer par userId
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        const totalCosts = costsByCategory.reduce((acc, category) => acc + category.totalAmount, 0);

        const response = {
            totalCosts,
            costsByCategory
        };

        await logAction(req.user._id, 'cost', 'total_costs_calculated', 
            'Calcul des coûts totaux', {
                totalCosts,
                costsByCategory,
            });

        res.status(200).send(response);
    } catch (error) {
        console.error('Error in calculateTotalCosts:', error);
        res.status(500).send({ message: "Erreur lors du calcul des coûts", error: error.message });
    }
};

/**
 * Calcule les besoins en aliments et enregistre un coût pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const calculateFeedRequirements = async (req, res) => {
    try {
        const { numberOfChickens, numberOfWeeks, feedType = 'standard' } = req.body;

        if (!numberOfChickens || !numberOfWeeks) {
            return res.status(400).send({
                message: "Veuillez fournir le nombre de poussins et le nombre de semaines"
            });
        }

        const weeklyConsumptionRates = {
            'standard': { '1-4': 0.35, '5-8': 0.7, '9+': 0.9 },
            'premium': { '1-4': 0.32, '5-8': 0.65, '9+': 0.85 },
            'economy': { '1-4': 0.38, '5-8': 0.75, '9+': 0.95 }
        };

        const feedBagSize = 25;
        let totalConsumption = 0;

        for (let week = 1; week <= numberOfWeeks; week++) {
            let weeklyRate;
            if (week <= 4) weeklyRate = weeklyConsumptionRates[feedType]['1-4'];
            else if (week <= 8) weeklyRate = weeklyConsumptionRates[feedType]['5-8'];
            else weeklyRate = weeklyConsumptionRates[feedType]['9+'];
            totalConsumption += weeklyRate * numberOfChickens;
        }

        const bagsNeeded = Math.ceil(totalConsumption / feedBagSize);
        const feedPrices = { 'standard': 15000, 'premium': 20000, 'economy': 12000 };
        const estimatedFeedCost = bagsNeeded * feedPrices[feedType];

        const costData = new Cost({
            userId: req.user._id, // Ajout du userId
            type: 'feed_calculation',
            description: 'Calcul des besoins en alimentation',
            amount: estimatedFeedCost,
            dynamicData: new Map([
                ['numberOfChickens', numberOfChickens.toString()],
                ['numberOfWeeks', numberOfWeeks.toString()],
                ['feedType', feedType],
                ['totalConsumption', totalConsumption.toFixed(2)],
                ['bagsNeeded', bagsNeeded.toString()],
                ['costPerBag', feedPrices[feedType].toString()]
            ])
        });

        await costData.save();

        const result = {
            totalFeedConsumptionKg: parseFloat(totalConsumption.toFixed(2)),
            bagsNeeded,
            estimatedFeedCost,
            feedType,
            details: {
                numberOfChickens,
                numberOfWeeks,
                feedBagSizeKg: feedBagSize,
                pricePerBag: feedPrices[feedType]
            },
            calculationId: costData._id
        };

        await logAction(req.user._id, 'cost', 'feed_requirements_calculated', 
            'Calcul des besoins en aliments', {
                costId: costData._id,
                ...result
            });

        res.status(200).send({
            message: "Calcul effectué et enregistré avec succès",
            data: result
        });
    } catch (error) {
        console.error('Erreur lors du calcul des besoins en aliments:', error);
        res.status(500).send({
            message: "Erreur lors du calcul des besoins en aliments",
            error: error.message
        });
    }
};

/**
 * Calcule la rentabilité prévisionnelle de l'élevage pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const calculateProfitability = async (req, res) => {
    try {
        const { numberOfChickens, chickPrice, feedCost, otherCosts, sellingPricePerUnit } = req.body;

        if (!numberOfChickens || !chickPrice || !sellingPricePerUnit) {
            return res.status(400).send({
                message: "Veuillez fournir le nombre de volailles, leur prix d'achat unitaire et le prix de vente unitaire"
            });
        }

        const purchaseCost = numberOfChickens * chickPrice;
        const totalCost = purchaseCost + (feedCost || 0) + (otherCosts || 0);
        const costPerUnit = totalCost / numberOfChickens;
        const totalRevenue = numberOfChickens * sellingPricePerUnit;
        const profit = totalRevenue - totalCost;
        const profitPerUnit = profit / numberOfChickens;

        const result = {
            numberOfChickens,
            purchaseCost,
            feedCost: feedCost || 0,
            otherCosts: otherCosts || 0,
            totalCost,
            costPerUnit,
            totalRevenue,
            profit,
            profitPerUnit,
            isProfitable: profit > 0,
            status: profit > 0 ? 'Bénéfice' : 'Perte'
        };

        const costData = new Cost({
            userId: req.user._id, // Ajout du userId
            type: 'profitability_calculation',
            description: 'Calcul de la rentabilité',
            amount: totalCost,
            dynamicData: new Map([
                ['numberOfChickens', numberOfChickens.toString()],
                ['purchaseCost', purchaseCost.toString()],
                ['feedCost', (feedCost || 0).toString()],
                ['otherCosts', (otherCosts || 0).toString()],
                ['totalCost', totalCost.toString()],
                ['totalRevenue', totalRevenue.toString()],
                ['profit', profit.toString()],
                ['status', profit > 0 ? 'Bénéfice' : 'Perte']
            ])
        });

        await costData.save();

        await logAction(req.user._id, 'cost', 'profitability_calculated', 
            'Calcul de la rentabilité', {
                calculationId: costData._id,
                numberOfChickens,
                purchaseCost,
                feedCost: feedCost || 0,
                otherCosts: otherCosts || 0,
                totalCost,
                profit
            });

        res.status(200).send({
            message: "Calcul de rentabilité effectué avec succès",
            data: result
        });
    } catch (error) {
        console.error('Error in calculateProfitability:', error);
        res.status(500).send({
            message: "Erreur lors du calcul de la rentabilité",
            error: error.message
        });
    }
};

/**
 * Récupère l'historique des calculs d'alimentation pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getFeedCalculationsHistory = async (req, res) => {
    try {
        const calculations = await Cost.find({
            userId: req.user._id, // Filtrer par userId
            type: 'feed_calculation'
        }).sort({ createdAt: -1 });

        res.status(200).send(calculations);
    } catch (error) {
        console.error('Error in getFeedCalculationsHistory:', error);
        res.status(500).send({
            message: "Erreur lors de la récupération de l'historique des calculs",
            error: error.message
        });
    }
};

// Exportation des fonctions du contrôleur
module.exports = {
    addCost,
    getCostHistory,
    getCostStats,
    calculateTotalCosts,
    calculateFeedRequirements,
    calculateProfitability,
    getFeedCalculationsHistory
};