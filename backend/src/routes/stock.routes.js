const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Route pour ajouter un nouveau stock
router.post('/', authMiddleware, stockController.addStock);

// Route pour obtenir les statistiques du stock
router.get('/stats', authMiddleware, stockController.getStockStats);

// Route pour mettre à jour un stock existant
router.put('/:id', authMiddleware, stockController.updateStock);

// Route pour mettre à jour la quantité d'un stock
router.put('/update-quantity/:id', authMiddleware, stockController.updateStockQuantity);

// Route pour obtenir le niveau du réservoir d'aliments
router.get('/food-tank-level', authMiddleware, stockController.getFoodTankLevel);

// Route pour obtenir le niveau du réservoir d'eau
router.get('/water-tank-level', authMiddleware, stockController.getWaterTankLevel);

// Route pour obtenir les quantités totales par type
router.get('/totals', authMiddleware, stockController.getTotals);

// Route pour décrémenter un stock
router.post('/decrement', authMiddleware, stockController.decrementStock);

// Route pour supprimer un stock
router.delete('/:id', authMiddleware, stockController.deleteStock);

// Route pour obtenir tous les stocks
router.get('/all', authMiddleware, stockController.getAllStocks);

router.get('/stocks/:id', authMiddleware, stockController.getStockById);

// Route pour obtenir les alertes de stock bas
router.get('/alerts/low-stock', authMiddleware, stockController.getAlertLowStock);

// Nouvelle route pour obtenir les stocks par type
router.get('/by-type/:type', authMiddleware, stockController.getStocksByType);

module.exports = router;
