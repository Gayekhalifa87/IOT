const express = require('express');
const router = express.Router();
const vaccineController = require('../controllers/vaccine.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware d'authentification

// --------------------------
// Routes pour les vaccins
// --------------------------

// Récupérer les vaccins à venir
router.get('/upcoming', authMiddleware, vaccineController.getUpcomingVaccines);

// Récupérer les vaccins administrés
router.get('/administered', authMiddleware, vaccineController.getAdministeredVaccines);

// Mettre à jour un vaccin existant
router.put('/:id', authMiddleware, vaccineController.updateVaccine);

// Supprimer un vaccin
router.delete('/:id', authMiddleware, vaccineController.deleteVaccine);

// Marquer un vaccin comme administré
router.put('/:id/administered', authMiddleware, vaccineController.markVaccineAsAdministered);

// Générer un calendrier de vaccination
router.post('/generate-schedule', authMiddleware, vaccineController.generateVaccinationSchedule);

// Récupérer le calendrier de vaccination
router.get('/schedule', authMiddleware, vaccineController.getVaccineSchedule);

// --------------------------
// Routes pour les notifications et rappels
// --------------------------

// Envoyer un rappel manuel pour un vaccin spécifique
router.post('/:id/reminder', authMiddleware, vaccineController.sendManualReminder);

// Mettre à jour les préférences de notification
router.put('/notifications/preferences', authMiddleware, vaccineController.updateNotificationPreferences);

// Envoyer un résumé hebdomadaire des vaccinations à venir
router.post('/notifications/weekly-summary', authMiddleware, vaccineController.sendWeeklySummary);

module.exports = router;