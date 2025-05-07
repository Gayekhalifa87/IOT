const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // Assurez-vous d'avoir un middleware d'authentification

// Route pour obtenir l'historique avec filtres
router.get('/', authMiddleware, historyController.getHistory);

// Route pour obtenir l'historique par type
router.get('/type/:type', authMiddleware, historyController.getHistoryByType);

// Route pour obtenir les statistiques de l'historique
router.get('/stats', authMiddleware, historyController.getHistoryStats);

// Route pour obtenir l'historique par utilisateur
router.get('/user/:userId', authMiddleware, historyController.getHistoryByUser);

// Route pour rechercher dans l'historique
router.get('/search', authMiddleware, historyController.searchHistory);

// Route pour supprimer une entrée de l'historique
router.delete('/:id', authMiddleware, historyController.deleteHistoryEntry);

// Route pour afficher l'historique dans la journée
router.get('/by-day', authMiddleware, historyController.getHistoryByDay);

// Route pour afficher l'historique par semaine
router.get('/by-week', authMiddleware, historyController.getHistoryByWeek);

// Route pour afficher l'historique par semaine
router.get('/by-month', authMiddleware, historyController.getHistoryByMonth);

router.get('/export/csv', authMiddleware, historyController.exportHistoryToCsv);

router.get('/export/excel', authMiddleware, historyController.exportHistoryToExcel);

router.get('/export/pdf', authMiddleware, historyController.exportHistoryToPdf);

module.exports = router;
