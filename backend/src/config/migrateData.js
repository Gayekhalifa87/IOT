const mongoose = require('mongoose');
const Vaccine = require('../models/vaccine.model');
const History = require('../models/history.model');
const Lamp = require('../models/lamp.model');
const Feeding = require('../models/feeding.model'); // Assurez-vous que ce fichier existe
const Cost = require('../models/cost.model');       // Assurez-vous que ce fichier existe
const Production = require('../models/production.model'); // Assurez-vous que ce fichier existe
const Stock = require('../models/stock.model');     // Assurez-vous que ce fichier existe
const User = require('../models/user.model');       // Assurez-vous que ce fichier existe

// Connexion à la base de données
mongoose.connect('mongodb://localhost:27017/smart_Coup_Chicken', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connecté à la base de données');
}).catch(err => {
  console.error('Erreur de connexion:', err);
  process.exit(1);
});

// Fonction pour obtenir un utilisateur par défaut
const getDefaultUserId = async () => {
  const defaultUser = await User.findOne({ email: 'sylvaantoine21@gmail.com' }); // Remplacez par un critère pertinent
  if (!defaultUser) {
    console.error('Aucun utilisateur par défaut trouvé. Veuillez créer un utilisateur.');
    process.exit(1);
  }
  return defaultUser._id;
};

// Migration pour le modèle Vaccine
const migrateVaccines = async (defaultUserId) => {
  try {
    const result = await Vaccine.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log('Migration des vaccins terminée:', result);
  } catch (error) {
    console.error('Erreur lors de la migration des vaccins:', error);
  }
};

// Migration pour le modèle History
const migrateHistory = async (defaultUserId) => {
  try {
    const result = await History.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: null } } // Peut être null pour les actions système
    );
    console.log('Migration de l\'historique terminée:', result);
  } catch (error) {
    console.error('Erreur lors de la migration de l\'historique:', error);
  }
};

// Migration pour le modèle Lamp
const migrateLamps = async (defaultUserId) => {
  try {
    const result = await Lamp.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log('Migration des lampes terminée:', result);
  } catch (error) {
    console.error('Erreur lors de la migration des lampes:', error);
  }
};

// Migration pour le modèle Feeding
const migrateFeeding = async (defaultUserId) => {
  try {
    const result = await Feeding.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log('Migration des données d\'alimentation terminée:', result);
  } catch (error) {
    console.error('Erreur lors de la migration des données d\'alimentation:', error);
  }
};

// Migration pour le modèle Cost
const migrateCosts = async (defaultUserId) => {
  try {
    const result = await Cost.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log('Migration des coûts terminée:', result);
  } catch (error) {
    console.error('Erreur lors de la migration des coûts:', error);
  }
};

// Migration pour le modèle Production
const migrateProduction = async (defaultUserId) => {
  try {
    const result = await Production.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log('Migration des données de production terminée:', result);
  } catch (error) {
    console.error('Erreur lors de la migration des données de production:', error);
  }
};

// Migration pour le modèle Stock
const migrateStock = async (defaultUserId) => {
  try {
    const result = await Stock.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: defaultUserId } }
    );
    console.log('Migration des stocks terminée:', result);
  } catch (error) {
    console.error('Erreur lors de la migration des stocks:', error);
  }
};

// Fonction principale de migration
const runMigration = async () => {
  try {
    const defaultUserId = await getDefaultUserId();

    // Exécuter les migrations pour chaque modèle
    await migrateVaccines(defaultUserId);
    await migrateHistory(defaultUserId); // Note: userId peut être null ici
    await migrateLamps(defaultUserId);
    await migrateFeeding(defaultUserId);
    await migrateCosts(defaultUserId);
    await migrateProduction(defaultUserId);
    await migrateStock(defaultUserId);

    console.log('Toutes les migrations sont terminées avec succès.');
  } catch (error) {
    console.error('Erreur globale lors de la migration:', error);
  } finally {
    mongoose.disconnect();
    console.log('Déconnexion de la base de données.');
  }
};

// Lancer la migration
runMigration();