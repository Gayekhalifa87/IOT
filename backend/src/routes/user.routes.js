const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // Assurez-vous d'avoir un middleware d'authentification
const adminMiddleware = require('../middlewares/admin.middleware'); // Middleware pour vérifier les rôles admin

// Route pour récupérer tous les utilisateurs avec filtres et pagination
router.get('/users', authMiddleware, adminMiddleware, userController.getUsers);

// Route pour récupérer un utilisateur par ID
router.get('/users/:id', authMiddleware, adminMiddleware, userController.getUserById);

// Route pour mettre à jour un utilisateur
router.put('/users/:id', authMiddleware, adminMiddleware, userController.updateUser);

// Route pour supprimer un utilisateur
router.delete('/users/:id', authMiddleware, adminMiddleware, userController.deleteUser);

// Route pour mettre à jour le statut d'un utilisateur
router.patch('/users/:id/status', authMiddleware, adminMiddleware, userController.updateUserStatus);

// Route pour mettre à jour le rôle d'un utilisateur
router.patch('/users/:id/role', authMiddleware, adminMiddleware, userController.updateUserRole);

// Route pour rechercher des utilisateurs
router.get('/users/search', authMiddleware, adminMiddleware, userController.searchUsers);

// Route pour obtenir les statistiques des utilisateurs
router.get('/users/stats', authMiddleware, adminMiddleware, userController.getUserStats);

module.exports = router;
