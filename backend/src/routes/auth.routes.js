const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // Assurez-vous d'avoir un middleware d'authentification



// Route pour l'inscription d'un nouvel utilisateur
router.post('/register', authController.register);

// Route pour la connexion d'un utilisateur
router.post('/login', authController.login);

router.post('/code', authController.loginWithCode);

// Route pour la déconnexion d'un utilisateur
router.post('/logout', authController.logout);


// Route pour obtenir les informations de l'utilisateur actuellement connecté
router.get('/me', authMiddleware, authController.getCurrentUser);

router.put('/update-profile', authMiddleware, authController.updateUserInfo);

// Route pour mettre à jour le mot de passe de l'utilisateur

router.put('/updatePassword', authMiddleware, authController.updatePassword);

router.get('/confirm-password-change/:token', authController.confirmPasswordChange);

router.get('/cancel-password-change/:token', authController.cancelPasswordChange);

router.post('/updateCode', authMiddleware, authController.updateCode);

// Nouvelles routes pour la réinitialisation de mot de passe
router.post('/forgot-password', authController.forgotPassword);

router.get('/reset-password/:token', authController.verifyResetToken);

router.post('/reset-password', authController.resetPassword);


module.exports = router;
