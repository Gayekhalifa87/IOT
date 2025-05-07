const express = require('express');
const router = express.Router();
const environmentalController = require('../controllers/environmental.controller'); // Vérifiez que c’est le bon contrôleur
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware d’authentification

// Route pour programmer l’allumage/extinction automatique de la lampe
router.post('/schedule/lighting', authMiddleware, environmentalController.scheduleLightingControl);

// Route pour récupérer la programmation de l’éclairage
router.get('/light-schedule', authMiddleware, environmentalController.getLightSchedule);

// Route pour récupérer les préférences de jour de l’éclairage
router.get('/light-preferences', authMiddleware, environmentalController.getLightPreferences);

// Route pour mettre à jour les préférences de jour de l’éclairage
router.post('/light-preferences', authMiddleware, environmentalController.updateLightPreferences);

// Route pour supprimer la programmation de l’éclairage
router.delete('/light-schedule/:id', authMiddleware, environmentalController.deleteLightSchedule);

// Route pour contrôler manuellement la lampe (allumer/éteindre)
router.post('/lighting/control', authMiddleware, environmentalController.controlLampManually);

module.exports = router;