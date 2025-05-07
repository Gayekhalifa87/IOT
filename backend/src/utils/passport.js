// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('../models/user.model');
// const dotenv = require('dotenv');

// // Charger les variables d'environnement
// dotenv.config();

// // Configuration de la stratégie Google
// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: process.env.GOOGLE_CALLBACK_URL,
//     passReqToCallback: true
// }, async (req, accessToken, refreshToken, profile, done) => {
//     try {
//         // Vérifier si l'utilisateur existe déjà
//         let user = await User.findOne({ googleId: profile.id });

//         if (!user) {
//             // Créer un nouvel utilisateur si n'existe pas
//             user = new User({
//                 googleId: profile.id,
//                 username: profile.displayName,
//                 email: profile.emails[0].value,
//                 role: 'user', // Vous pouvez définir un rôle par défaut
//                 status: 'active'
//             });
//             await user.save();
//         }

//         return done(null, user);
//     } catch (error) {
//         return done(error, null);
//     }
// }));

// // Sérialiser et désérialiser l'utilisateur
// passport.serializeUser((user, done) => {
//     done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//     try {
//         const user = await User.findById(id);
//         done(null, user);
//     } catch (error) {
//         done(error, null);
//     }
// });

// module.exports = passport;
