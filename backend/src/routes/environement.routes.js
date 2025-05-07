// environement.routes.js
const express = require('express');
const router = express.Router();
const environmentController = require('../controllers/environement.controller');


// Vérification de l'existence des fonctions du contrôleur
console.log('Contrôleur environnement:', Object.keys(environmentController));

// Routes pour les données environnementales
router.get('/latest', environmentController.getLatestEnvironmentData);
router.get('/history', environmentController.getEnvironmentHistory);

module.exports = router;