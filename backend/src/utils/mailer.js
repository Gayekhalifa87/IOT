// const nodemailer = require('nodemailer');
// const dotenv = require('dotenv');

// // Charger les variables d'environnement
// dotenv.config();

// // Créer un transporteur pour envoyer des emails
// const transporter = nodemailer.createTransport({
//     service: 'gmail', // Utilisation du service Gmail
//     host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Serveur SMTP de Gmail
//     port: process.env.EMAIL_PORT || 587, // Port SMTP pour Gmail
//     secure: false, // true pour le port 465, false pour les autres ports
//     auth: {
//         user: process.env.EMAIL_USER, // Votre adresse email
//         pass: process.env.EMAIL_PASS, // Votre mot de passe email ou mot de passe d'application
//     },
//     tls: {
//         rejectUnauthorized: false, // Désactiver la vérification du certificat (utile en développement)
//     },
// });

// // Fonction pour envoyer un email
// const sendEmail = async (to, subject, text, html) => {
//     const mailOptions = {
//         from: `"Smart Coup Chicken" <${process.env.EMAIL_USER}>`, // Expéditeur avec un nom personnalisé
//         to,
//         subject,
//         text,
//         html,
//     };

//     try {
//         const info = await transporter.sendMail(mailOptions);
//         console.log('Email envoyé avec succès:', info.response);
//         return info;
//     } catch (error) {
//         console.error('Erreur lors de l\'envoi de l\'email:', error);
//         throw new Error('Erreur lors de l\'envoi de l\'email');
//     }
// };

// module.exports = { sendEmail };