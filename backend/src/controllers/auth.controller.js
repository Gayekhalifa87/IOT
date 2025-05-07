// Importation des modules nécessaires
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const EmailService = require('../services/emailService');
const { logAction } = require('../services/historyService');
const BlacklistedToken = require('../models/blacklistedToken');
const PasswordChangeToken = require('../models/passwordchangetokens');

/**
 * Génère un token JWT pour un utilisateur.
 * @param {Object} user - L'utilisateur pour lequel générer le token.
 * @returns {string} - Le token JWT généré.
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

/**
 * Génère un code à 4 chiffres aléatoire.
 * @returns {string} - Le code généré.
 */
const generateCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Génère un code entre 1000 et 9999
};

/**
 * Inscrit un nouvel utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */

const register = async (req, res) => {
    try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ $or: [{ username: req.body.username }, { email: req.body.email }] });
        if (existingUser) {
            return res.status(400).send({
                success: false,
                message: 'Inscription échouée',
                error: 'Ce nom d\'utilisateur ou cet email est déjà utilisé. Veuillez en choisir un autre.',
            });
        }

        // Générer un code à 4 chiffres
        const code = generateCode();
        const plainPassword = req.body.password;

        // Créer le nouvel utilisateur
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: plainPassword,
            code: code,
            role: req.body.role || 'user'
        });

        // Sauvegarder l'utilisateur
        await user.save();

        // Envoyer un email de confirmation avec le mot de passe
        try {
            const userData = {
                prenom: user.username.split(' ')[0] || user.username,
                nom: user.username.split(' ')[1] || '',
                email: user.email,
                code: user.code,
                role: user.role,
                password: plainPassword
            };
            await EmailService.sendUserCredentials(userData);
            console.log(`Email de bienvenue envoyé à ${user.email}`);
        } catch (emailError) {
            console.error('Erreur lors de l\'envoi de l\'email:', emailError);
        }

        // Réponse de succès
        res.status(201).send({
            success: true,
            message: 'Inscription réussie. Un email contenant vos identifiants vous a été envoyé.',
            data: {
                user: {
                    _id: user._id,
                    username: user.username,
                    role: user.role,
                },
                code: user.code,
            },
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            message: 'Erreur lors de l\'inscription',
            error: error.message,
            details: 'Une erreur s\'est produite lors de la création de votre compte. Veuillez réessayer.',
        });
    }
};

/**
 * Connecte un utilisateur avec email et mot de passe.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).send({
                success: false,
                message: 'Connexion échouée',
                error: 'Email incorrect',
            });
        }

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).send({
                success: false,
                message: 'Connexion échouée',
                error: 'Mot de passe incorrect',
            });
        }

        // Générer le token
        const token = generateToken(user);

        // Enregistrer l'action dans l'historique avec le type 'connexion'
        await logAction(user._id, 'connexion', 'user_logged_in', 'Utilisateur connecté', {
            email: user.email,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Retourner l'utilisateur et le token
        const userObject = user.toObject();
        delete userObject.password;

        res.send({
            success: true,
            message: 'Connexion réussie',
            data: {
                user: userObject,
                token,
            },
        });
    } catch (error) {
        console.error('Erreur de connexion:', error);
        res.status(500).send({
            success: false,
            message: 'Erreur lors de la connexion',
            error: error.message,
            details: 'Une erreur s\'est produite lors de la connexion. Veuillez réessayer.',
        });
    }
};


/**
 * Connecte un utilisateur avec un code.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const loginWithCode = async (req, res) => {
    try {
        const { code } = req.body;

        // Vérifier si le code est fourni
        if (!code) {
            return res.status(400).send({
                success: false,
                message: 'Code requis',
                error: 'Veuillez fournir un code pour vous connecter.'
            });
        }

        // Vérifier si un utilisateur possède ce code
        const user = await User.findOne({ code });

        if (!user) {
            return res.status(401).send({
                success: false,
                message: 'Connexion échouée',
                error: 'Code incorrect'
            });
        }

        // Générer le token
        const token = generateToken(user);

        // Retourner l'utilisateur et le token (sans le mot de passe)
        const userObject = user.toObject();
        delete userObject.password;

        res.send({
            success: true,
            message: 'Connexion réussie avec le code',
            data: {
                user: userObject,
                token,
            },
        });
    } catch (error) {
        console.error('Erreur lors de la connexion avec le code:', error);
        res.status(500).send({
            success: false,
            message: 'Erreur lors de la connexion',
            error: error.message,
            details: 'Une erreur s\'est produite lors de la connexion avec le code. Veuillez réessayer.'
        });
    }
};

/**
 * Déconnecte un utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const logout = async (req, res) => {
    try {
        // Récupérer le token depuis l'en-tête d'autorisation
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(400).send({
                success: false,
                message: 'Token non fourni'
            });
        }
        
        // Décoder le token pour obtenir les informations d'expiration
        let tokenData;
        try {
            tokenData = jwt.decode(token);
        } catch (err) {
            return res.status(400).send({
                success: false,
                message: 'Token invalide'
            });
        }
        
        // Calculer la date d'expiration
        const expiresAt = tokenData.exp 
            ? new Date(tokenData.exp * 1000) 
            : new Date(Date.now() + 86400000); // Date par défaut: maintenant + 24h
        
        // Ajouter le token à la blacklist
        await BlacklistedToken.create({
            token,
            expiresAt,
            userId: req.user ? req.user.id : null
        });

        await logAction(req.user._id, 'auth', 'user_logged_out', 'Utilisateur déconnecté', {
            timestamp: CURRENT_UTC_DATETIME,
            loggedOutBy: CURRENT_USER
        });
        
        console.log(`Utilisateur déconnecté: ${req.user ? req.user.id : 'Inconnu'}`);
        
        res.send({
            success: true,
            message: 'Déconnexion réussie'
        });
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).send({
            success: false,
            message: 'Erreur lors de la déconnexion',
            error: error.message,
            details: 'Une erreur s\'est produite lors de la déconnexion. Veuillez réessayer.'
        });
    }
};



/**
 * Récupère le profil de l'utilisateur actuellement connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Utilisateur non trouvé',
                error: 'Aucun utilisateur trouvé avec cet identifiant.'
            });
        }
        res.send({
            success: true,
            message: 'Profil utilisateur récupéré avec succès',
            data: {
                username: user.username,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: 'Erreur lors de la récupération du profil',
            error: error.message,
            details: 'Une erreur s\'est produite lors de la récupération du profil utilisateur. Veuillez réessayer.'
        });
    }
};

/**
 * Met à jour le mot de passe de l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const currentDateTime = new Date(); // Utilisez new Date() au lieu d'une chaîne fixe
        const currentUser = 'Antoine627';

        if (!currentPassword || !newPassword) {
            return res.status(400).send({
                success: false,
                message: 'Données manquantes',
                error: 'Les champs mot de passe actuel et nouveau mot de passe sont requis.'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).send({
                success: false,
                message: 'Mot de passe trop court',
                error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).send({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }

        try {
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            console.log('Nouveau mot de passe hashé:', hashedNewPassword);

            const confirmationToken = require('crypto').randomBytes(32).toString('hex');

            await new PasswordChangeToken({
                userId: user._id,
                token: confirmationToken,
                newPassword: hashedNewPassword,
                createdAt: currentDateTime
            }).save();

            const userData = {
                prenom: user.username.split(' ')[0] || user.username,
                nom: user.username.split(' ')[1] || '',
                email: user.email,
                confirmationToken: confirmationToken,
                requestTime: currentDateTime,
                requestedBy: currentUser
            };

            await EmailService.sendPasswordChangeNotification({
                ...userData,
                confirmationLink: `${process.env.FRONTEND_URL}/api/auth/confirm-password-change/${confirmationToken}`,
                cancelLink: `${process.env.FRONTEND_URL}/api/auth/cancel-password-change/${confirmationToken}`
            });

            await logAction(user._id, 'security', 'password_change_requested', 
                'Demande de changement de mot de passe initiée', {
                    timestamp: currentDateTime,
                    requestedBy: currentUser,
                    confirmationToken: confirmationToken
                }
            );

            res.send({
                success: true,
                message: 'Demande de changement de mot de passe envoyée. Veuillez vérifier vos emails.'
            });

        } catch (error) {
            console.error('Erreur lors du processus:', error);
            res.status(500).send({
                success: false,
                message: 'Erreur lors de la mise à jour du mot de passe',
                error: error.message
            });
        }

    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).send({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};



/**
 * Confirme le changement de mot de passe en vérifiant le token.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const confirmPasswordChange = async (req, res) => {
    try {
        const { token } = req.params;
        const currentDateTime = new Date();
        const currentUser = 'Antoine627';

        console.log(`Tentative de confirmation avec le token: ${token}`);

        // Rechercher le token de changement de mot de passe
        const passwordChangeRequest = await PasswordChangeToken.findOne({ token }).lean();
        if (!passwordChangeRequest) {
            console.error('Token non trouvé ou déjà utilisé');
            return res.status(400).send({
                success: false,
                message: 'Token invalide ou déjà utilisé',
                error: 'Le lien de confirmation n\'est plus valide.'
            });
        }

        // Vérifier si le token n'a pas expiré (24h)
        const tokenCreationTime = new Date(passwordChangeRequest.createdAt);
        const expirationTime = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
        if (currentDateTime - tokenCreationTime > expirationTime) {
            await PasswordChangeToken.deleteOne({ _id: passwordChangeRequest._id });
            console.error('Token expiré');
            return res.status(400).send({
                success: false,
                message: 'Token expiré',
                error: 'Le lien de confirmation a expiré. Veuillez refaire une demande.'
            });
        }

        // Vérifier l'utilisateur
        const user = await User.findById(passwordChangeRequest.userId);
        if (!user) {
            console.error('Utilisateur non trouvé');
            return res.status(404).send({
                success: false,
                message: 'Utilisateur non trouvé',
                error: 'L\'utilisateur associé à cette demande n\'existe plus.'
            });
        }

        // Vérifier et loguer les mots de passe avant mise à jour
        console.log('Mot de passe avant mise à jour:', user.password);
        console.log('Nouveau mot de passe hashé à sauvegarder:', passwordChangeRequest.newPassword);

        // Effectuer la mise à jour
        const updateResult = await User.updateOne(
            { _id: passwordChangeRequest.userId },
            {
                $set: {
                    password: passwordChangeRequest.newPassword,
                    lastPasswordUpdate: currentDateTime
                }
            }
        );

        // Vérifier si la mise à jour a réussi
        if (updateResult.modifiedCount !== 1) {
            console.error('Échec de la mise à jour du mot de passe:', updateResult);
            return res.status(500).send({
                success: false,
                message: 'Échec de la mise à jour du mot de passe',
                error: 'Aucune modification n\'a été effectuée dans la base de données.',
                details: updateResult
            });
        }

        // Recharger l'utilisateur pour confirmer la mise à jour
        const reloadedUser = await User.findById(passwordChangeRequest.userId);
        console.log('Mot de passe après mise à jour (reloaded):', reloadedUser.password);

        if (!reloadedUser.password || reloadedUser.password !== passwordChangeRequest.newPassword) {
            console.error('Le mot de passe n\'a pas été mis à jour correctement');
            return res.status(500).send({
                success: false,
                message: 'Erreur lors de la mise à jour du mot de passe',
                error: 'Le mot de passe dans la base de données ne correspond pas au nouveau mot de passe.'
            });
        }

        // Supprimer le token après utilisation
        await PasswordChangeToken.deleteOne({ _id: passwordChangeRequest._id });

        // Envoyer l'email de confirmation
        const userData = {
            prenom: user.username.split(' ')[0] || user.username,
            nom: user.username.split(' ')[1] || '',
            email: user.email,
            lastUpdateAt: currentDateTime,
            lastUpdateBy: currentUser
        };

        await EmailService.sendPasswordChangeConfirmation(userData);

        // Log de l'action
        await logAction(user._id, 'security', 'password_changed', 
            'Mot de passe modifié avec succès', {
                timestamp: currentDateTime,
                updatedBy: currentUser
            }
        );

        res.send({
            success: true,
            message: 'Mot de passe modifié avec succès',
            data: {
                message: 'Votre mot de passe a été modifié. Veuillez vous reconnecter avec votre nouveau mot de passe.'
            }
        });

    } catch (error) {
        console.error('Erreur lors de la confirmation:', error);
        res.status(500).send({
            success: false,
            message: 'Erreur lors de la confirmation',
            error: error.message,
            details: 'Une erreur inattendue est survenue.'
        });
    }
};


/**
 * Annule une demande de changement de mot de passe.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const cancelPasswordChange = async (req, res) => {
    try {
        const { token } = req.params;

        // Supprimer la demande de changement de mot de passe
        const passwordChange = await PasswordChangeToken.findOneAndDelete({ token });

        if (!passwordChange) {
            return res.status(400).send({
                success: false,
                message: 'Token invalide ou expiré',
                error: 'La demande de changement de mot de passe n\'existe pas ou a déjà été traitée.'
            });
        }

        // Enregistrer l'action dans l'historique
        await logAction(passwordChange.userId, 'user', 'password_change_cancelled', 
            'Changement de mot de passe annulé', {
                cancelledAt: new Date()
            }
        );

        res.send({
            success: true,
            message: 'Demande de changement de mot de passe annulée',
            data: {
                message: 'La demande de changement de mot de passe a été annulée avec succès.'
            }
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: 'Erreur lors de l\'annulation du changement de mot de passe',
            error: error.message
        });
    }
};



/**
 * Met à jour le code de connexion d'un utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const updateCode = async (req, res) => {
    try {
        // Récupérer l'utilisateur
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Utilisateur non trouvé',
                error: 'Aucun utilisateur trouvé avec cet identifiant.'
            });
        }

        // Générer un nouveau code
        const newCode = generateCode(); // Assurez-vous que cette fonction est définie

        // Mettre à jour le code de l'utilisateur
        user.code = newCode;
        await user.save();

        // Journaliser l'action
        await logAction(user._id, 'security', 'code_updated', 
            'Code de connexion mis à jour', {
                timestamp: new Date().toISOString(), // Utiliser la date actuelle
                updatedBy: req.user.username || req.user._id // Utiliser l'utilisateur actuel
            }
        );

        // Préparer les données pour l'envoi d'email
        const userData = {
            prenom: user.username.split(' ')[0] || user.username,
            nom: user.username.split(' ')[1] || '',
            email: user.email,
            code: newCode,
            role: user.role
        };

        // Envoyer le nouveau code par email
        try {
            await EmailService.sendCodeUpdate(userData);
            console.log(`Email avec nouveau code envoyé à ${user.email}`);
        } catch (emailError) {
            console.error('Erreur lors de l\'envoi de l\'email avec le nouveau code:', emailError);
            // On continue malgré l'erreur d'email, mais on informe l'utilisateur
            return res.status(500).send({
                success: false,
                message: 'Le code a été mis à jour, mais l\'email n\'a pas pu être envoyé.',
                error: emailError.message
            });
        }

        // Réponse réussie
        res.send({
            success: true,
            message: 'Code de connexion mis à jour avec succès et email envoyé',
            data: {
                code: newCode
            }
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du code:', error);
        res.status(500).send({
            success: false,
            message: 'Erreur lors de la mise à jour du code',
            error: error.message,
            details: 'Une erreur s\'est produite lors de la mise à jour du code de connexion. Veuillez réessayer.'
        });
    }
};


/**
 * Demande de réinitialisation de mot de passe.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Utilisateur non trouvé',
                error: 'Aucun compte n\'est associé à cette adresse email.'
            });
        }

        // Générer un token JWT avec une expiration
        const resetToken = jwt.sign(
            { _id: user._id }, // Données à inclure dans le token
            process.env.JWT_RESET_SECRET || process.env.JWT_SECRET, // Clé secrète
            { expiresIn: '1h' } // Durée de validité du token
        );

        // Envoyer le lien de réinitialisation par email
        try {
            const resetData = {
                prenom: user.username.split(' ')[0] || user.username,
                nom: user.username.split(' ')[1] || '',
                email: user.email,
                resetToken: resetToken
            };

            await EmailService.sendPasswordResetLink(resetData);
            console.log(`Email de réinitialisation de mot de passe envoyé à ${user.email}`);
        } catch (emailError) {
            console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', emailError);
        }

        res.send({
            success: true,
            message: 'Email de réinitialisation envoyé',
            data: {
                message: 'Un email contenant les instructions pour réinitialiser votre mot de passe a été envoyé à votre adresse email.'
            }
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: 'Erreur lors de la demande de réinitialisation',
            error: error.message,
            details: 'Une erreur s\'est produite lors de la demande de réinitialisation de mot de passe. Veuillez réessayer.'
        });
    }
};
        /**
         * Vérifie la validité du token de réinitialisation.
         * @param {Object} req - Requête HTTP.
         * @param {Object} res - Réponse HTTP.
         */
        const verifyResetToken = async (req, res) => {
            try {
                const { token } = req.params;
        
                if (!token) {
                    return res.status(400).send({
                        success: false,
                        message: 'Token requis',
                        error: 'Veuillez fournir un token de réinitialisation.'
                    });
                }
        
                // Vérifier le token JWT
                let decoded;
                try {
                    decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || process.env.JWT_SECRET);
                } catch (jwtError) {
                    return res.status(401).send({
                        success: false,
                        message: 'Token invalide',
                        error: 'Le token de réinitialisation est invalide ou a expiré.'
                    });
                }
        
                // Vérifier si l'utilisateur existe
                const user = await User.findById(decoded._id);
                if (!user) {
                    return res.status(404).send({
                        success: false,
                        message: 'Utilisateur non trouvé',
                        error: 'Aucun compte n\'est associé à ce token.'
                    });
                }
        
                res.send({
                    success: true,
                    message: 'Token valide',
                    data: {
                        userId: user._id
                    }
                });
            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: 'Erreur lors de la vérification du token',
                    error: error.message,
                    details: 'Une erreur s\'est produite lors de la vérification du token de réinitialisation. Veuillez réessayer.'
                });
            }
        };
        /**
         * Réinitialise le mot de passe après vérification du token.
         * @param {Object} req - Requête HTTP.
         * @param {Object} res - Réponse HTTP.
         */
        const resetPassword = async (req, res) => {
            try {
                const { token, newPassword } = req.body;
        
                if (!token || !newPassword) {
                    return res.status(400).send({
                        success: false,
                        message: 'Données manquantes',
                        error: 'Veuillez fournir le token et le nouveau mot de passe.'
                    });
                }
        
                // Vérifier le token JWT
                let decoded;
                try {
                    decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || process.env.JWT_SECRET);
                } catch (jwtError) {
                    return res.status(401).send({
                        success: false,
                        message: 'Token invalide',
                        error: 'Le token de réinitialisation est invalide ou a expiré.'
                    });
                }
        
                // Vérifier si l'utilisateur existe
                const user = await User.findById(decoded._id);
                if (!user) {
                    return res.status(404).send({
                        success: false,
                        message: 'Utilisateur non trouvé',
                        error: 'Aucun compte n\'est associé à ce token.'
                    });
                }
        
                // Mettre à jour le mot de passe
                user.password = newPassword;
                await user.save();
        
                // Envoyer un email de confirmation
                try {
                    const userData = {
                        prenom: user.username.split(' ')[0] || user.username,
                        nom: user.username.split(' ')[1] || '',
                        email: user.email
                    };
        
                    await EmailService.sendPasswordChangeConfirmation(userData);
                    console.log(`Email de confirmation de réinitialisation de mot de passe envoyé à ${user.email}`);
                } catch (emailError) {
                    console.error('Erreur lors de l\'envoi de l\'email de confirmation:', emailError);
                }
        
                res.send({
                    success: true,
                    message: 'Mot de passe réinitialisé avec succès',
                    data: {
                        message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
                    }
                });
            } catch (error) {
                res.status(500).send({
                    success: false,
                    message: 'Erreur lors de la réinitialisation du mot de passe',
                    error: error.message,
                    details: 'Une erreur s\'est produite lors de la réinitialisation du mot de passe. Veuillez réessayer.'
                });
            }
        };



        /**
 * Met à jour les informations de l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const updateUserInfo = async (req, res) => {
    try {
        const { username, email } = req.body;
        const userId = req.user._id;
        const currentDateTime = new Date('2025-02-27 13:38:09');
        const currentUser = 'Antoine627';

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'Utilisateur non trouvé',
                error: 'Aucun utilisateur trouvé avec cet identifiant.'
            });
        }

        // Vérifier si l'email est déjà utilisé par un autre utilisateur
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).send({
                    success: false,
                    message: 'Email déjà utilisé',
                    error: 'Cet email est déjà utilisé par un autre utilisateur.'
                });
            }
        }

        // Vérifier si le nom d'utilisateur est déjà utilisé par un autre utilisateur
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).send({
                    success: false,
                    message: 'Nom d\'utilisateur déjà utilisé',
                    error: 'Ce nom d\'utilisateur est déjà utilisé.'
                });
            }
        }

        // Mettre à jour les informations de l'utilisateur
        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;

        // Mise à jour de l'utilisateur
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        // Enregistrer l'action dans l'historique
        await logAction(userId, 'user', 'profile_updated', 'Profil utilisateur mis à jour', {
            timestamp: currentDateTime,
            updatedBy: currentUser,
            updates: updates
        });

        // Envoyer un email de confirmation
        try {
            const userData = {
                prenom: updatedUser.username.split(' ')[0] || updatedUser.username,
                nom: updatedUser.username.split(' ')[1] || '',
                email: updatedUser.email
            };
            await EmailService.sendProfileUpdateConfirmation(userData);
            console.log(`Email de confirmation de mise à jour du profil envoyé à ${updatedUser.email}`);
        } catch (emailError) {
            console.error('Erreur lors de l\'envoi de l\'email de confirmation:', emailError);
        }

        res.send({
            success: true,
            message: 'Profil mis à jour avec succès',
            data: updatedUser
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        res.status(500).send({
            success: false,
            message: 'Erreur lors de la mise à jour du profil',
            error: error.message,
            details: 'Une erreur s\'est produite lors de la mise à jour du profil. Veuillez réessayer.'
        });
    }
};



/**
 * Envoie un email de confirmation après la mise à jour du profil.
 * @param {Object} userData - Les données de l'utilisateur.
 */
const sendProfileUpdateConfirmation = async (userData) => {
    const subject = 'Confirmation de mise à jour du profil';
    const html = `
        <h1>Confirmation de mise à jour du profil</h1>
        <p>Bonjour ${userData.prenom} ${userData.nom},</p>
        <p>Nous vous confirmons que votre profil a été mis à jour avec succès.</p>
        <p>Si vous n'êtes pas à l'origine de cette modification, veuillez nous contacter immédiatement.</p>
        <p>Cordialement,<br>L'équipe de support</p>
    `;

    await sendEmail(userData.email, subject, html);
};


        
// Exportation des fonctions du contrôleur
module.exports = {
    register,
    login,
    loginWithCode,
    logout,
    getCurrentUser,
    updatePassword,
    confirmPasswordChange,
    cancelPasswordChange,
    updateCode,
    forgotPassword,
    verifyResetToken,
    resetPassword,
    updateUserInfo,
    sendProfileUpdateConfirmation
};
