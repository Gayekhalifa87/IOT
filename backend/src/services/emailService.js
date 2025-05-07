const transporter = require('../config/emailConfig');

class EmailService {
    static async sendUserCredentials(userData) {
        try {
            const mailOptions = {
                from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: 'Vos informations de compte pour la plateforme - CocoRico (Automatisation de Poulailler)',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FFD700;">Bienvenue sur CocoRico !</h2>
                        <p>Bonjour ${userData.prenom} ${userData.nom},</p>
                        <p>Votre compte a été créé avec succès le ${new Date(userData.createdAt).toLocaleString('fr-FR')} par ${userData.createdBy}.</p>
                        <p>Voici vos informations de connexion :</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Prénom :</strong> ${userData.prenom}</p>
                            <p><strong>Nom :</strong> ${userData.nom}</p>
                            <p><strong>Email :</strong> ${userData.email}</p>
                            <p><strong>Mot de passe :</strong> ${userData.password}</p>
                            <p><strong>Code de connexion :</strong> ${userData.code}</p>
                        </div>
    
                        <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                            <p style="color: #856404; margin: 0;">
                                <strong>Important :</strong> Pour des raisons de sécurité, nous vous recommandons fortement de :
                            </p>
                            <ul style="color: #856404; margin: 10px 0;">
                                <li>Changer votre mot de passe dès votre première connexion</li>
                                <li>Modifier votre code de connexion</li>
                                <li>Ne pas partager ces informations avec d'autres personnes</li>
                            </ul>
                        </div>
    
                        <p>Pour vous connecter, vous pouvez utiliser :</p>
                        <ul>
                            <li>Votre email et mot de passe</li>
                            <li>Ou votre code de connexion</li>
                        </ul>
    
                        <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                        
                        <div style="font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                            <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                            <p>Si vous n'êtes pas à l'origine de cette inscription, veuillez nous contacter immédiatement.</p>
                        </div>
                    </div>
                `
            };
    
            const info = await transporter.sendMail(mailOptions);
            console.log('Email envoyé avec succès:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            throw error;
        }
    }

    /**
     * Envoie un email de notification de changement de mot de passe
     * @param {Object} userData - Données de l'utilisateur
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
    static async sendPasswordChangeNotification(userData) {
        try {
            const mailOptions = {
                from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: 'Confirmation de changement de mot de passe - CocoRico',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FFD700;">Demande de changement de mot de passe</h2>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p>Bonjour ${userData.prenom},</p>
                            <p>Une demande de modification de votre mot de passe a été effectuée le ${userData.requestTime} par ${userData.requestedBy}.</p>
                        </div>
    
                        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="color: #856404;">
                                <strong>⚠️ IMPORTANT :</strong>
                            </p>
                            <p>Si vous n'êtes pas à l'origine de cette demande, cliquez sur "Annuler" immédiatement.</p>
                        </div>
    
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL}/api/auth/confirm-password-change/${userData.confirmationToken}"
                               style="display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px;">
                                ✅ Confirmer le changement
                            </a>
                            
                            <a href="${process.env.FRONTEND_URL}/api/auth/cancel-password-change/${userData.confirmationToken}"
                               style="display: inline-block; background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px;">
                                ❌ Annuler le changement
                            </a>
                        </div>
    
                        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Informations importantes :</strong></p>
                            <ul>
                                <li>Cette demande expirera dans 24 heures</li>
                                <li>Si vous confirmez, vous serez déconnecté et devrez vous reconnecter</li>
                                <li>Si vous annulez, votre mot de passe actuel restera inchangé</li>
                            </ul>
                        </div>
    
                        <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                        
                        <div style="margin-top: 20px; font-size: 12px; color: #666;">
                            <p>Email automatique - Ne pas répondre</p>
                        </div>
                    </div>
                `
            };
    
            const info = await transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            throw error;
        }
    }
    


    /**
     * Envoie un email de confirmation après changement de mot de passe réussi
     * @param {Object} userData - Données de l'utilisateur
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
    static async sendPasswordChangeConfirmation(userData) {
        try {
            const mailOptions = {
                from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: 'Confirmation de changement de mot de passe - CocoRico',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FFD700;">Mot de passe modifié avec succès</h2>
                        <p>Bonjour ${userData.prenom} ${userData.nom},</p>
                        <p>Nous vous confirmons que votre mot de passe a été modifié avec succès.</p>
                        
                        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="color: #155724;"><strong>Information de sécurité :</strong></p>
                            <p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement notre service client.</p>
                        </div>
                        
                        <p>Vous pouvez désormais vous connecter avec votre nouveau mot de passe.</p>
                        
                        <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                        
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #666;">
                            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                            <p>Si vous avez des questions, contactez notre support à ${process.env.SUPPORT_EMAIL || 'support@cocorico.fr'}</p>
                        </div>
                    </div>
                `
            };
            
            const info = await transporter.sendMail(mailOptions);
            console.log('Email de confirmation de changement de mot de passe envoyé avec succès:', info.messageId);
            
            return { 
                success: true, 
                messageId: info.messageId 
            };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email de confirmation de changement de mot de passe:', error);
            throw error;
        }
    }

    




     /**
     * Envoie un email de notification d'annulation de changement de mot de passe
     * @param {Object} userData - Données de l'utilisateur
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
     static async sendPasswordChangeCancellation(userData) {
        try {
            const mailOptions = {
                from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: 'Annulation de changement de mot de passe - CocoRico',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FFD700;">Demande de changement de mot de passe annulée</h2>
                        <p>Bonjour ${userData.prenom} ${userData.nom},</p>
                        <p>Nous vous confirmons que la demande de changement de mot de passe pour votre compte a été annulée.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Information :</strong></p>
                            <p>Aucune modification n'a été apportée à votre compte. Vous pouvez continuer à utiliser votre mot de passe actuel.</p>
                        </div>
                        
                        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="color: #856404;"><strong>Information de sécurité :</strong></p>
                            <p>Si vous n'avez pas annulé cette demande de changement de mot de passe, veuillez contacter immédiatement notre service client.</p>
                        </div>
                        
                        <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                        
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8em; color: #666;">
                            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                            <p>Si vous avez des questions, contactez notre support à ${process.env.SUPPORT_EMAIL || 'support@cocorico.fr'}</p>
                        </div>
                    </div>
                `
            };
            
            const info = await transporter.sendMail(mailOptions);
            console.log('Email d\'annulation de changement de mot de passe envoyé avec succès:', info.messageId);
            
            return { 
                success: true, 
                messageId: info.messageId 
            };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email d\'annulation de changement de mot de passe:', error);
            throw error;
        }
    }


    

    /**
     * Envoie un email avec le nouveau code de connexion
     * @param {Object} userData - Données de l'utilisateur
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
    static async sendCodeUpdate(userData) {
        try {
            const mailOptions = {
                from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: 'Votre nouveau code de connexion - CocoRico',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FFD700;">Nouveau code de connexion - CocoRico</h2>
                        <p>Bonjour ${userData.prenom} ${userData.nom},</p>
                        <p>Votre code de connexion a été mis à jour avec succès.</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Votre nouveau code :</strong> ${userData.code}</p>
                        </div>
                        <p style="color: #e74c3c;"><strong>Important :</strong> Ne partagez jamais ce code avec d'autres personnes.</p>
                        <p>Ce code vous permettra de vous connecter à votre compte rapidement.</p>
                        <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email avec nouveau code envoyé avec succès:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email avec le nouveau code:', error);
            throw error;
        }
    }

    /**
     * Envoie un email contenant le lien de réinitialisation de mot de passe.
     * @param {Object} userData - Les données de l'utilisateur.
     * @returns {Promise} - Promesse résolue lorsque l'email est envoyé.
     */
    static async sendPasswordResetLink(userData) {
        try {
            const { prenom, email, resetToken } = userData;
    
            // Construire le lien de réinitialisation pour l'application Angular
            const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
            // Configuration de l'email
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'cocorico@gmail.com',
                to: email,
                subject: 'Réinitialisation de votre mot de passe',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h2 style="color: #333;">Réinitialisation de votre mot de passe</h2>
                        <p>Bonjour ${prenom},</p>
                        <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
                        <p>Pour réinitialiser votre mot de passe, veuillez cliquer sur le lien ci-dessous :</p>
                        <p style="text-align: center;">
                            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 5px;">
                                Réinitialiser mon mot de passe
                            </a>
                        </p>
                        <p>Ce lien est valable pendant 1 heure. Passé ce délai, vous devrez faire une nouvelle demande de réinitialisation.</p>
                        <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
                        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                            Cordialement,<br>
                            L'équipe de support
                        </p>
                    </div>
                `
            };
    
            // Envoi de l'email
            const info = await transporter.sendMail(mailOptions);
            console.log('Email de réinitialisation envoyé avec succès:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
            throw error;
        }
    }

    /**
     * Envoie un email de confirmation après la réinitialisation du mot de passe.
     * @param {Object} userData - Les données de l'utilisateur.
     * @returns {Promise} - Promesse résolue lorsque l'email est envoyé.
     */
    static async sendPasswordChangeConfirmation(userData) {
        try {
            const { prenom, email } = userData;

            // Configuration de l'email
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'cocorico@gmail.com',
                to: email,
                subject: 'Confirmation de changement de mot de passe',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                        <h2 style="color: #333;">Mot de passe modifié avec succès</h2>
                        <p>Bonjour ${prenom},</p>
                        <p>Nous vous confirmons que votre mot de passe a été modifié avec succès.</p>
                        <p>Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement notre service client.</p>
                        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                            Cordialement,<br>
                            L'équipe de support
                        </p>
                    </div>
                `
            };

            // Envoi de l'email
            const info = await transporter.sendMail(mailOptions);
            console.log('Email de confirmation de changement de mot de passe envoyé avec succès:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email de confirmation de changement de mot de passe:', error);
            throw error;
        }
    }


 /**
     * Envoie une notification de rappel d'alimentation programmée
     * @param {Object} userData - Données de l'utilisateur
     * @param {Object} feedingData - Données de l'alimentation
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
 static async sendFeedingReminderNotification(userData, feedingData) {
    try {
        const mailOptions = {
            from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: 'Rappel - Alimentation programmée - CocoRico',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FFD700;">Rappel d'Alimentation - CocoRico</h2>
                    <p>Bonjour ${userData.prenom},</p>
                    <p>Une alimentation programmée va bientôt commencer :</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Type d'alimentation :</strong> ${feedingData.feedType}</p>
                        <p><strong>Quantité :</strong> ${feedingData.quantity} unités</p>
                        <p><strong>Heure de début :</strong> ${new Date(feedingData.programStartTime).toLocaleString()}</p>
                        <p><strong>Heure de fin :</strong> ${new Date(feedingData.programEndTime).toLocaleString()}</p>
                    </div>
                    <p style="color: #e74c3c;"><strong>Important :</strong> Veuillez vérifier que le système est prêt pour cette distribution.</p>
                    <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de rappel d\'alimentation:', error);
        throw error;
    }
}

/**
 * Envoie une alerte de stock bas
 * @param {Object} userData - Données de l'utilisateur
 * @param {Object} stockData - Données du stock
 * @returns {Promise<Object>} - Résultat de l'envoi d'email
 */
static async sendLowStockAlert(stockData) {
    try {
      const username = stockData.username || 'Utilisateur'; // Valeur par défaut si undefined
      const mailOptions = {
        from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
        to: stockData.email,
        subject: 'ALERTE - Niveau de stock critique - CocoRico',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF4500;">⚠️ Alerte Stock Critique - CocoRico</h2>
            <p>Bonjour ${username},</p> <!-- Utiliser username avec valeur par défaut -->
            <p>Le système a détecté un niveau de stock critique :</p>
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeeba;">
              <p><strong>Type de stock :</strong> ${stockData.type}</p>
              <p><strong>Niveau actuel :</strong> ${stockData.currentStock} ${stockData.unit}</p>
              <p><strong>Seuil minimal :</strong> ${stockData.threshold} ${stockData.unit}</p>
            </div>
            <p style="color: #e74c3c;">
              <strong>Action requise :</strong> Un réapprovisionnement est nécessaire pour assurer le bon fonctionnement du système.
            </p>
            <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
          </div>
        `
      };
  
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'alerte de stock bas:', error);
      throw error;
    }
  }

/**
 * Envoie une confirmation d'ajout d'alimentation
 * @param {Object} userData - Données de l'utilisateur
 * @param {Object} feedingData - Données de l'alimentation
 * @returns {Promise<Object>} - Résultat de l'envoi d'email
 */
static async sendFeedingAddedConfirmation(userData, feedingData) {
    try {
        const mailOptions = {
            from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: 'Confirmation - Nouvelle alimentation programmée - CocoRico',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Nouvelle Alimentation Programmée - CocoRico</h2>
                    <p>Bonjour ${userData.prenom},</p>
                    <p>Une nouvelle alimentation a été programmée avec succès :</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Type d'alimentation :</strong> ${feedingData.feedType}</p>
                        <p><strong>Quantité :</strong> ${feedingData.quantity} unités</p>
                        ${feedingData.programStartTime ? `
                        <p><strong>Heure de début :</strong> ${new Date(feedingData.programStartTime).toLocaleString()}</p>
                        <p><strong>Heure de fin :</strong> ${new Date(feedingData.programEndTime).toLocaleString()}</p>
                        ` : ''}
                    </div>
                    <p>Vous recevrez un rappel une heure avant le début de l'alimentation programmée.</p>
                    <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la confirmation d\'ajout d\'alimentation:', error);
        throw error;
    }
}



 /**
     * Envoie une confirmation d'ajout de stock
     * @param {Object} userData - Données de l'utilisateur
     * @param {Object} stockData - Données du stock
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
 static async sendStockAddedConfirmation(userData, stockData) {
    try {
        const mailOptions = {
            from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: 'Confirmation - Nouveau stock ajouté - CocoRico',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Nouveau Stock Ajouté - CocoRico</h2>
                    <p>Bonjour ${userData.prenom},</p>
                    <p>Un nouveau stock a été ajouté avec succès :</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Type de stock :</strong> ${stockData.type}</p>
                        <p><strong>Quantité :</strong> ${stockData.quantity} ${stockData.unit}</p>
                        <p><strong>Date d'ajout :</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p>Le système de gestion des stocks a été mis à jour en conséquence.</p>
                    <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la confirmation d\'ajout de stock:', error);
        throw error;
    }
}

/**
 * Envoie une notification de mise à jour de stock
 * @param {Object} userData - Données de l'utilisateur
 * @param {Object} stockData - Données du stock
 * @returns {Promise<Object>} - Résultat de l'envoi d'email
 */
static async sendStockUpdateNotification(userData, stockData) {
    try {
        const mailOptions = {
            from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: 'Mise à jour de stock - CocoRico',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2196F3;">Mise à Jour de Stock - CocoRico</h2>
                    <p>Bonjour ${userData.prenom},</p>
                    <p>Un stock a été mis à jour dans le système :</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Type de stock :</strong> ${stockData.type}</p>
                        <p><strong>Nouvelle quantité :</strong> ${stockData.quantity} ${stockData.unit}</p>
                        <p><strong>Date de mise à jour :</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification de mise à jour de stock:', error);
        throw error;
    }
}

/**
 * Envoie une alerte de stock bas
 * @param {Object} stockData - Données du stock
 * @returns {Promise<Object>} - Résultat de l'envoi d'email
 */
static async sendLowStockAlert(stockData) {
    try {
        const mailOptions = {
            from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
            to: stockData.email,
            subject: 'ALERTE - Niveau de stock critique - CocoRico',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FF4500;">⚠️ Alerte Stock Critique - CocoRico</h2>
                    <p>Bonjour ${stockData.prenom},</p>
                    <p>Le système a détecté un niveau de stock critique :</p>
                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeeba;">
                        <p><strong>Type de stock :</strong> ${stockData.type}</p>
                        <p><strong>Niveau actuel :</strong> ${stockData.currentStock} ${stockData.unit}</p>
                        <p><strong>Seuil minimal :</strong> ${stockData.threshold} ${stockData.unit}</p>
                    </div>
                    <p style="color: #e74c3c;">
                        <strong>Action requise :</strong> Un réapprovisionnement est nécessaire pour assurer le bon fonctionnement du système.
                    </p>
                    <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'alerte de stock bas:', error);
        throw error;
    }
}

/**
 * Envoie une notification de suppression de stock
 * @param {Object} userData - Données de l'utilisateur
 * @param {Object} stockData - Données du stock
 * @returns {Promise<Object>} - Résultat de l'envoi d'email
 */
static async sendStockDeletedNotification(userData, stockData) {
    try {
        const mailOptions = {
            from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: 'Confirmation - Suppression de stock - CocoRico',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #9E9E9E;">Stock Supprimé - CocoRico</h2>
                    <p>Bonjour ${userData.prenom},</p>
                    <p>Un stock a été supprimé du système :</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Type de stock :</strong> ${stockData.type}</p>
                        <p><strong>Quantité supprimée :</strong> ${stockData.quantity} ${stockData.unit}</p>
                        <p><strong>Date de suppression :</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification de suppression de stock:', error);
        throw error;
    }
}




 /**
     * Envoie un rappel de vaccination à venir
     * @param {Object} userData - Données de l'utilisateur
     * @param {Object} vaccineData - Données du vaccin
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
    static async sendVaccineReminder(userData, vaccineData) {
        try {
            const mailOptions = {
                from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: `Rappel de vaccination: ${vaccineData.name}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FFD700;">Rappel de Vaccination - CocoRico</h2>
                        <p>Bonjour ${userData.prenom} ${userData.nom},</p>
                        <p>Un vaccin doit être administré prochainement :</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Vaccin :</strong> ${vaccineData.name}</p>
                            <p><strong>Date prévue :</strong> ${new Date(vaccineData.dateAdministered).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</p>
                            <p><strong>Nombre de volailles :</strong> ${vaccineData.numberOfChickens}</p>
                            <p><strong>Notes :</strong> ${vaccineData.notes || 'Aucune note spécifique'}</p>
                        </div>
                        <p style="color: #e74c3c;"><strong>Important :</strong> Veuillez vous assurer d'avoir le vaccin disponible à l'avance.</p>
                        <p>Vous pourrez marquer ce vaccin comme administré dans l'application après l'avoir réalisé.</p>
                        <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email de rappel de vaccination envoyé avec succès:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email de rappel de vaccination:', error);
            throw error;
        }
    }

    /**
     * Envoie une confirmation de vaccination effectuée
     * @param {Object} userData - Données de l'utilisateur
     * @param {Object} vaccineData - Données du vaccin
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
    static async sendVaccineConfirmation(userData, vaccineData) {
        try {
            const mailOptions = {
                from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: `Confirmation de vaccination - ${vaccineData.name}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4CAF50;">Vaccination Effectuée - CocoRico</h2>
                        <p>Bonjour ${userData.prenom} ${userData.nom},</p>
                        <p>La vaccination suivante a été enregistrée comme effectuée :</p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>Vaccin :</strong> ${vaccineData.name}</p>
                            <p><strong>Date d'administration :</strong> ${new Date(vaccineData.administeredDate).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</p>
                            <p><strong>Nombre de volailles :</strong> ${vaccineData.numberOfChickens}</p>
                            <p><strong>Notes :</strong> ${vaccineData.notes || 'Aucune note spécifique'}</p>
                        </div>
                        ${vaccineData.nextDueDate ? `
                        <p><strong>Prochain rappel prévu :</strong> ${new Date(vaccineData.nextDueDate).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</p>
                        ` : ''}
                        <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email de confirmation de vaccination envoyé avec succès:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email de confirmation de vaccination:', error);
            throw error;
        }
    }

    /**
     * Envoie un résumé hebdomadaire des vaccinations à venir
     * @param {Object} userData - Données de l'utilisateur
     * @param {Array} vaccines - Liste des vaccins à venir
     * @returns {Promise<Object>} - Résultat de l'envoi d'email
     */
    static async sendVaccineWeeklySummary(userData, vaccines) {
        try {
            const vaccineListHTML = vaccines.map(vaccine => `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${vaccine.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${new Date(vaccine.dateAdministered).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${vaccine.numberOfChickens}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${vaccine.notes || '-'}</td>
                </tr>
            `).join('');

            const mailOptions = {
                from: `"CocoRico (Automatisation de Poulailler)" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                subject: 'Résumé hebdomadaire des vaccinations à venir - CocoRico',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2196F3;">Résumé des Vaccinations à Venir - CocoRico</h2>
                        <p>Bonjour ${userData.prenom} ${userData.nom},</p>
                        <p>Voici la liste des vaccinations prévues pour les 7 prochains jours :</p>
                        <table style="border-collapse: collapse; width: 100%;">
                            <thead>
                                <tr>
                                    <th style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Vaccin</th>
                                    <th style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Date</th>
                                    <th style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Nombre de volailles</th>
                                    <th style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vaccineListHTML}
                            </tbody>
                        </table>
                        <p style="color: #e74c3c;"><strong>Important :</strong> Veuillez vous assurer d'avoir tous les vaccins nécessaires disponibles.</p>
                        <p style="margin-top: 30px;">Cordialement,<br>L'équipe CocoRico</p>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email de résumé hebdomadaire des vaccinations envoyé avec succès:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email de résumé hebdomadaire des vaccinations:', error);
            throw error;
        }
    }


}

module.exports = EmailService;
