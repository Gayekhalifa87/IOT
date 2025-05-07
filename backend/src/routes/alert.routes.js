const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // Assurez-vous d'avoir un middleware d'authentification

// Route pour créer une nouvelle alerte
router.post('/alerts', authMiddleware, alertController.createAlert);

// Route pour obtenir toutes les alertes
router.get('/alerts', authMiddleware, alertController.getAlerts);

// Route pour obtenir les alertes actives
router.get('/alerts/active', authMiddleware, alertController.getActiveAlerts);

// Route pour obtenir les alertes critiques
router.get('/alerts/critical', authMiddleware, alertController.getCriticalAlerts);

// Route pour acquitter une alerte
router.put('/alerts/:id/acknowledge', authMiddleware, alertController.acknowledgeAlert);

// Route pour résoudre une alerte
router.put('/alerts/:id/resolve', authMiddleware, alertController.resolveAlert);

// Route pour ajouter une action à une alerte
router.post('/alerts/:id/actions', authMiddleware, alertController.addActionToAlert);

module.exports = router;
