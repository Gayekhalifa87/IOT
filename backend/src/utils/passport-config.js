// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const FacebookStrategy = require('passport-facebook').Strategy;
// const GitHubStrategy = require('passport-github2').Strategy;
// const User = require('./models/user.model'); // Assurez-vous que le chemin est correct

// // Configuration de Passport.js
// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: 'http://localhost:3000/auth/google/callback'
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     try {
//       let user = await User.findOne({ googleId: profile.id });
//       if (!user) {
//         user = new User({
//           googleId: profile.id,
//           username: profile.displayName,
//           email: profile.emails[0].value,
//           role: 'user'
//         });
//         await user.save();
//       }
//       return done(null, user);
//     } catch (err) {
//       return done(err);
//     }
//   }
// ));

// // Répétez des configurations similaires pour Facebook et GitHub
// passport.use(new FacebookStrategy({
//     clientID: process.env.FACEBOOK_CLIENT_ID,
//     clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
//     callbackURL: 'http://localhost:3000/auth/facebook/callback'
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     // Logique similaire à celle de Google
//   }
// ));

// passport.use(new GitHubStrategy({
//     clientID: process.env.GITHUB_CLIENT_ID,
//     clientSecret: process.env.GITHUB_CLIENT_SECRET,
//     callbackURL: 'http://localhost:3000/auth/github/callback'
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     // Logique similaire à celle de Google
//   }
// ));

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (err) {
//     done(err);
//   }
// });
