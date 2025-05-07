// src/routes/cost.routes.js
const express = require('express');
const router = express.Router();
const costController = require('../controllers/cost.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Route pour ajouter un coût
router.post('/', authMiddleware, costController.addCost);

// Route pour obtenir l'historique des coûts
router.get('/history', authMiddleware, costController.getCostHistory);

// Route pour obtenir les statistiques des coûts
router.get('/stats', authMiddleware, costController.getCostStats);

router.get('/feed-calculations', authMiddleware, costController.getFeedCalculationsHistory);

// Route pour calculer tous les coûts
router.get('/total', authMiddleware, costController.calculateTotalCosts);

router.post('/feed-requirements', authMiddleware, costController.calculateFeedRequirements);

router.post('/profitability', authMiddleware, costController.calculateProfitability);

module.exports = router;