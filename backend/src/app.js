const express = require('express');
const passport = require('passport');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { scheduledCleanup } = require('./utils/tokenCleanup');

// Importer les contrôleurs
const vaccineController = require('./controllers/vaccine.controller');
const feedingController = require('./controllers/feeding.controller');

// Charger les variables d'environnement
dotenv.config();

// Log the MongoDB URI for debugging
console.log("MongoDB URI:", process.env.MONGODB_URI);

// Initialiser l'application Express
const app = express();

// Middleware pour analyser les requêtes JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Activer le nettoyage programmé
scheduledCleanup();

// Middleware pour gérer les CORS
app.use(cors());

// Connexion à la base de données MongoDB
mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to the database');

    // Initialiser les rappels automatiques après la connexion à la base de données
    vaccineController.setupReminderCronJobs();
    feedingController.setupFeedingReminderCronJobs(); // Ajouter cette ligne pour les rappels d'alimentation
});

// Importer les routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productionRoutes = require('./routes/production.routes');
const vaccineRoutes = require('./routes/vaccine.routes');
const feedingRoutes = require('./routes/feeding.routes');
const environmentalRoutes = require('./routes/environmental.routes');
const historyRoutes = require('./routes/history.routes');
const costRoutes = require('./routes/cost.routes');
const stockRoutes = require('./routes/stock.routes');
const environementRoutes = require('./routes/environement.routes');

// Utiliser les routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/productions', productionRoutes);
app.use('/api/vaccins', vaccineRoutes);
app.use('/api/feedings', feedingRoutes);
app.use('/api/environmental', environmentalRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/environements', environementRoutes);


// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});