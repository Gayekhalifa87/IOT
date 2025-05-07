const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // Assurez-vous d'avoir un middleware d'authentification

// Route pour ajouter une nouvelle production
router.post('/', authMiddleware, productionController.addProduction);

router.get('/', authMiddleware, productionController.getAllProductions);

// Route pour obtenir les statistiques de production
router.get('/stats', authMiddleware, productionController.getProductionStats);

// Route pour mettre à jour une production
router.put('/:id', authMiddleware, productionController.updateProduction);

// Route pour supprimer une production
router.delete('/:id', authMiddleware, productionController.deleteProduction);



module.exports = router;
