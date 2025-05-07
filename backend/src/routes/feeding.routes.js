
// src/routes/feeding.routes.js
const express = require('express');
const router = express.Router();
const feedingController = require('../controllers/feeding.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const costController = require('../controllers/cost.controller');

// Route pour obtenir les statistiques des alimentations
router.get('/stats', authMiddleware, feedingController.getFeedingStats);

// Route pour obtenir les alertes de stock bas
router.get('/alerts/low-stock', authMiddleware, feedingController.getAlertLowStock);

// Route pour ajouter plusieurs alimentations en une seule requête
router.post('/bulk', authMiddleware, feedingController.bulkAddFeedings);

// Route pour décrémenter la quantité d'une alimentation
router.patch('/:id/decrement', authMiddleware, feedingController.decrementQuantity);

router.get('/consumption-stats', authMiddleware, feedingController.getConsumptionStats);

// Routes pour les rappels d'alimentation
router.post('/check-reminders', authMiddleware, async (req, res) => {
    try {
        await feedingController.checkFeedingReminders();
        res.status(200).json({ message: "Vérification des rappels effectuée avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la vérification des rappels", error: error.message });
    }
});


// Route pour obtenir les programmes d'alimentation avec leurs stocks
router.get('/with-stock', authMiddleware, feedingController.getFeedingProgramWithStock);


// Route pour démarrer/arrêter les tâches cron de rappel (pour les administrateurs)
router.post('/cron/start', authMiddleware, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Accès non autorisé" });
    }
    
    feedingController.setupFeedingReminderCronJobs();
    res.status(200).json({ message: "Tâches planifiées démarrées avec succès" });
});


// Routes génériques

// Route pour obtenir l'historique des alimentations
router.get('/', authMiddleware, feedingController.getFeedingHistory);

// Route pour obtenir toutes les alimentations
router.get('/all', authMiddleware, feedingController.getAllFeedings);

// Route pour ajouter une nouvelle alimentation
router.post('/', authMiddleware, feedingController.addFeeding);

// Route pour mettre à jour une alimentation
router.put('/:id', authMiddleware, feedingController.updateFeeding);

// Route pour archiver une alimentation
router.put('/:id/archive', authMiddleware, feedingController.archiveFeeding);

// Route pour obtenir les alimentations archivées
router.get('/archived', authMiddleware, feedingController.getArchivedFeedings);

// Route pour mettre à jour l'apport en eau
router.put('/:id/water-supply', authMiddleware, feedingController.updateWaterSupply);


// Routes pour l'Arduino
router.post('/arduino/programs', authMiddleware, feedingController.sendProgramsToArduino);


router.post('/arduino/command', authMiddleware, feedingController.sendManualCommandToArduino);


router.post('/stop-water-immediate', authMiddleware, feedingController.stopWaterImmediate);


router.post('/stop-feeding-immediate', authMiddleware, feedingController.stopFeedingImmediate);


router.get('/consumed/food', authMiddleware, feedingController.getConsumedFood);


router.get('/consumed/water', authMiddleware, feedingController.getConsumedWater);


router.get('/distribution', authMiddleware, feedingController.getDistributionQuantity);


module.exports = router;
