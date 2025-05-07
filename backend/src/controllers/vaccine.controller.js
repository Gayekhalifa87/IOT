const Vaccine = require('../models/vaccine.model');
const History = require('../models/history.model');
const User = require('../models/user.model');
const EmailService = require('../services/emailService');
const cron = require('node-cron');
const { logAction } = require('../services/historyService');

/**
 * Envoie un rappel de vaccination
 * @param {Object} user - Utilisateur destinataire
 * @param {Object} vaccine - Vaccin concerné par le rappel
 * @returns {Promise<boolean>} - Statut de l'envoi
 */
const sendVaccineReminder = async (user, vaccine) => {
  try {
    const userData = {
      email: user.email,
      prenom: user.prenom || user.username || 'Utilisateur', // Fallback si prenom n'existe pas
      nom: user.nom || ''
    };

    await EmailService.sendVaccineReminder(userData, vaccine);

    await logAction(user._id, 'vaccine', 'reminder_sent', 
      `Rappel envoyé pour le vaccin: ${vaccine.name}`, {
        vaccineId: vaccine._id,
        vaccineName: vaccine.name,
        reminderDate: new Date(),
      });

    console.log(`Rappel envoyé à ${user.email} pour le vaccin ${vaccine.name}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du rappel de vaccination:', error);
    return false;
  }
};

/**
 * Vérifie et envoie les rappels de vaccination (exécuté par cron)
 */
const checkAndSendVaccineReminders = async () => {
  try {
    const today = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);

    const upcomingVaccines = await Vaccine.find({
      dateAdministered: { $gte: today, $lte: twoDaysFromNow },
      administered: { $ne: true }
    }).populate('userId');

    const userVaccines = {};
    upcomingVaccines.forEach(vaccine => {
      if (!vaccine.userId) return;
      const userId = vaccine.userId._id.toString();
      if (!userVaccines[userId]) {
        userVaccines[userId] = { user: vaccine.userId, vaccines: [] };
      }
      userVaccines[userId].vaccines.push(vaccine);
    });

    for (const userId in userVaccines) {
      const { user, vaccines } = userVaccines[userId];
      for (const vaccine of vaccines) {
        await sendVaccineReminder(user, vaccine);
      }
    }

    await logAction(null, 'vaccine', 'reminders_checked', 
      `Rappels vérifiés pour ${upcomingVaccines.length} vaccins`, {
        upcomingVaccinesCount: upcomingVaccines.length,
      });

    console.log(`Rappels vérifiés et envoyés pour ${upcomingVaccines.length} vaccins à venir`);
  } catch (error) {
    console.error('Erreur lors de la vérification des rappels de vaccination:', error);
  }
};

/**
 * Configure les tâches cron pour les rappels automatiques
 */
const setupReminderCronJobs = () => {
  cron.schedule('0 8 * * *', () => {
    console.log('Exécution de la vérification des rappels de vaccination...');
    checkAndSendVaccineReminders();
  });
  console.log('Tâches cron pour les rappels de vaccination configurées avec succès');
};

/**
 * Envoie un rappel manuel pour un vaccin spécifique
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const sendManualReminder = async (req, res) => {
  try {
    const vaccine = await Vaccine.findById(req.params.id);
    if (!vaccine) {
      return res.status(404).send({ error: 'Vaccin non trouvé' });
    }
    if (vaccine.userId.toString() !== req.user._id.toString()) {
      return res.status(403).send({ error: 'Non autorisé' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send({ error: 'Utilisateur non trouvé' });
    }

    const success = await sendVaccineReminder(user, vaccine); // Utilisation de la fonction existante

    if (success) {
      res.send({ success: true, message: 'Rappel envoyé avec succès' });
    } else {
      res.status(500).send({ success: false, error: 'Échec de l\'envoi du rappel' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi du rappel manuel:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors de l\'envoi du rappel manuel' });
  }
};

/**
 * Configure les préférences de notification d'un utilisateur
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const updateNotificationPreferences = async (req, res) => {
  try {
    const { enableEmailReminders, reminderDays = 2, dailySummary = false } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { notificationPreferences: { enableEmailReminders, reminderDays, dailySummary } },
      { new: true }
    );

    await logAction(req.user._id, 'user', 'notification_preferences_updated', 
      'Préférences de notification mises à jour', {
        enableEmailReminders,
        reminderDays,
        dailySummary,
      });

    res.send({
      success: true,
      message: 'Préférences de notification mises à jour',
      preferences: updatedUser.notificationPreferences
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences de notification:', error);
    res.status(400).send({ error: error.message, message: 'Erreur lors de la mise à jour des préférences' });
  }
};

/**
 * Envoie un résumé des vaccins à venir pour la semaine
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const sendWeeklySummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send({ error: 'Utilisateur non trouvé' });
    }

    const userData = {
      email: user.email,
      prenom: user.prenom || user.username || 'Utilisateur',
      nom: user.nom || ''
    };

    const today = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + 7);

    const upcomingVaccines = await Vaccine.find({
      userId: req.user._id,
      dateAdministered: { $gte: today, $lte: oneWeekLater },
      administered: { $ne: true },
    }).sort({ dateAdministered: 1 });

    if (upcomingVaccines.length === 0) {
      return res.send({ success: true, message: 'Aucun vaccin prévu pour la semaine à venir' });
    }

    await EmailService.sendVaccineWeeklySummary(userData, upcomingVaccines);

    await logAction(req.user._id, 'vaccine', 'weekly_summary_sent', 
      `Résumé hebdomadaire envoyé avec ${upcomingVaccines.length} vaccins à venir`, {
        vaccineCount: upcomingVaccines.length,
        summaryDate: new Date(),
      });

    res.send({
      success: true,
      message: 'Résumé hebdomadaire envoyé avec succès',
      upcomingVaccineCount: upcomingVaccines.length,
    });
  } catch (error) {
    console.error('Erreur dans sendWeeklySummary:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors de l\'envoi du résumé hebdomadaire' });
  }
};

/**
 * Génère un calendrier de vaccination basé sur le type de volaille
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const generateVaccinationSchedule = async (req, res) => {
  try {
    const { startDate, chickenType, numberOfChickens, scheduleType = 'standard' } = req.body;

    if (!startDate || !chickenType || !numberOfChickens) {
      return res.status(400).send({
        error: 'Paramètres manquants',
        message: 'La date de début, le type de volaille et le nombre de volailles sont requis'
      });
    }

    const durations = {
      standard: { pondeuse: 42, chair: 49, mixte: 42 },
      complet: { pondeuse: 56, chair: 56, mixte: 56 }
    };

    if (!durations[scheduleType] || !durations[scheduleType][chickenType]) {
      return res.status(400).send({
        error: 'Type de calendrier ou de volaille non supporté',
        message: 'Types supportés: standard, complet. Volailles: pondeuse, chair, mixte'
      });
    }

    const totalDays = durations[scheduleType][chickenType];
    const baseDate = new Date(startDate);

    const vaccineSchedules = {
      pondeuse: {
        standard: [
          { name: 'Marek', dayOffset: 1, week: 1 },
          { name: 'Newcastle + Bronchite', dayOffset: 7, week: 1 },
          { name: 'Gumboro', dayOffset: 14, week: 2 },
          { name: 'Newcastle + Bronchite (rappel)', dayOffset: 28, week: 4 },
          { name: 'Encéphalomyélite', dayOffset: 35, week: 5 }
        ],
        complet: [
          { name: 'Marek', dayOffset: 1, week: 1 },
          { name: 'Newcastle + Bronchite', dayOffset: 7, week: 1 },
          { name: 'Gumboro', dayOffset: 14, week: 2 },
          { name: 'Newcastle + Bronchite (rappel)', dayOffset: 28, week: 4 },
          { name: 'Encéphalomyélite', dayOffset: 42, week: 6 },
          { name: 'Gumboro (rappel)', dayOffset: 49, week: 7 },
          { name: 'Newcastle (final)', dayOffset: 56, week: 8 }
        ]
      },
      chair: {
        standard: [
          { name: 'Marek', dayOffset: 1, week: 1 },
          { name: 'Newcastle', dayOffset: 7, week: 1 },
          { name: 'Gumboro', dayOffset: 14, week: 2 },
          { name: 'Newcastle (rappel)', dayOffset: 21, week: 3 },
          { name: 'Gumboro (rappel)', dayOffset: 35, week: 5 }
        ],
        complet: [
          { name: 'Marek', dayOffset: 1, week: 1 },
          { name: 'Newcastle', dayOffset: 7, week: 1 },
          { name: 'Gumboro', dayOffset: 14, week: 2 },
          { name: 'Newcastle (rappel)', dayOffset: 21, week: 3 },
          { name: 'Gumboro (rappel)', dayOffset: 35, week: 5 },
          { name: 'Bronchite', dayOffset: 42, week: 6 },
          { name: 'Newcastle (final)', dayOffset: 56, week: 8 }
        ]
      },
      mixte: {
        standard: [
          { name: 'Marek', dayOffset: 1, week: 1 },
          { name: 'Newcastle + Bronchite', dayOffset: 7, week: 1 },
          { name: 'Gumboro', dayOffset: 14, week: 2 },
          { name: 'Newcastle + Bronchite (rappel)', dayOffset: 28, week: 4 }
        ],
        complet: [
          { name: 'Marek', dayOffset: 1, week: 1 },
          { name: 'Newcastle + Bronchite', dayOffset: 7, week: 1 },
          { name: 'Gumboro', dayOffset: 14, week: 2 },
          { name: 'Newcastle + Bronchite (rappel)', dayOffset: 28, week: 4 },
          { name: 'Gumboro (rappel)', dayOffset: 42, week: 6 },
          { name: 'Newcastle (final)', dayOffset: 56, week: 8 }
        ]
      }
    };

    const selectedSchedule = vaccineSchedules[chickenType][scheduleType];
    if (!selectedSchedule) {
      return res.status(400).send({
        error: 'Calendrier non défini',
        message: `Aucun calendrier pour ${chickenType} avec ${scheduleType}`
      });
    }

    const vaccines = [];
    for (const vaccine of selectedSchedule) {
      const vaccineDate = new Date(baseDate);
      vaccineDate.setDate(baseDate.getDate() + vaccine.dayOffset);

      const newVaccine = new Vaccine({
        name: vaccine.name,
        dateAdministered: vaccineDate,
        numberOfChickens,
        notes: `Semaine ${vaccine.week} - Généré automatiquement - ${chickenType} - ${scheduleType}`,
        userId: req.user._id,
        administered: false,
        weekNumber: vaccine.week
      });

      const savedVaccine = await newVaccine.save();
      vaccines.push(savedVaccine);
    }

    await logAction(req.user._id, 'vaccine', 'schedule_generated', 
      `Calendrier de vaccination généré pour ${numberOfChickens} ${chickenType}(s)`, {
        chickenType,
        numberOfChickens,
        scheduleType,
        vaccineCount: vaccines.length,
        totalDurationDays: totalDays
      });

    res.status(201).send({
      success: true,
      message: `Calendrier généré avec ${vaccines.length} vaccins sur ${totalDays / 7} semaines`,
      vaccines
    });
  } catch (error) {
    console.error('Erreur lors de la génération du calendrier:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors de la génération du calendrier' });
  }
};

/**
 * Marque un vaccin comme administré
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const markVaccineAsAdministered = async (req, res) => {
  try {
    const { id } = req.params;
    const { administeredDate, notes } = req.body;

    const vaccine = await Vaccine.findOne({ _id: id, userId: req.user._id });
    if (!vaccine) {
      return res.status(404).send({ error: 'Vaccin non trouvé ou non autorisé' });
    }

    vaccine.administered = true;
    vaccine.administeredDate = administeredDate || new Date();
    if (notes) vaccine.notes = notes;

    await vaccine.save();

    const history = new History({
      type: 'vaccine',
      data: { vaccineId: vaccine._id, vaccineName: vaccine.name, administeredDate: vaccine.administeredDate },
      userId: req.user._id,
      action: 'vaccine_administered',
      description: `Vaccin ${vaccine.name} administré à ${vaccine.numberOfChickens} volailles`
    });
    await history.save();

    res.send({ success: true, message: 'Vaccin marqué comme administré', vaccine });
  } catch (error) {
    console.error('Erreur lors du marquage du vaccin:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors du marquage du vaccin' });
  }
};

/**
 * Récupère les vaccins à venir pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getUpcomingVaccines = async (req, res) => {
  try {
    const today = new Date();
    const vaccines = await Vaccine.find({
      userId: req.user._id,
      dateAdministered: { $gte: today },
      administered: { $ne: true }
    }).sort({ dateAdministered: 1 });

    res.send({ success: true, count: vaccines.length, vaccines });
  } catch (error) {
    console.error('Erreur lors de la récupération des vaccins à venir:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors de la récupération des vaccins à venir' });
  }
};

/**
 * Récupère les vaccins déjà administrés pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getAdministeredVaccines = async (req, res) => {
  try {
    const vaccines = await Vaccine.find({
      userId: req.user._id,
      administered: true
    }).sort({ administeredDate: -1 });

    res.send({ success: true, count: vaccines.length, vaccines });
  } catch (error) {
    console.error('Erreur lors de la récupération des vaccins administrés:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors de la récupération des vaccins administrés' });
  }
};

/**
 * Récupère le calendrier de vaccination de l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getVaccineSchedule = async (req, res) => {
  try {
    const vaccines = await Vaccine.find({ 
      userId: req.user._id,
      administered: false
    }).sort({ dateAdministered: 1 });

    res.send({ success: true, count: vaccines.length, vaccines });
  } catch (error) {
    console.error('Erreur lors de la récupération du calendrier:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors de la récupération du calendrier' });
  }
};

/**
 * Met à jour un vaccin existant
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const updateVaccine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dateAdministered, numberOfChickens, notes } = req.body;

    const vaccine = await Vaccine.findOne({ _id: id, userId: req.user._id });
    if (!vaccine) {
      return res.status(404).send({ error: 'Vaccin non trouvé ou non autorisé' });
    }

    if (name) vaccine.name = name;
    if (dateAdministered) vaccine.dateAdministered = dateAdministered;
    if (numberOfChickens) vaccine.numberOfChickens = numberOfChickens;
    if (notes) vaccine.notes = notes;

    const updatedVaccine = await vaccine.save();

    const history = new History({
      type: 'vaccine',
      data: { vaccineId: updatedVaccine._id, vaccineName: updatedVaccine.name, updateData: req.body },
      userId: req.user._id,
      action: 'vaccine_updated',
      description: `Vaccin ${updatedVaccine.name} mis à jour`
    });
    await history.save();

    res.send({ success: true, message: 'Vaccin mis à jour avec succès', vaccine: updatedVaccine });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du vaccin:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors de la mise à jour du vaccin' });
  }
};

/**
 * Supprime un vaccin
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const deleteVaccine = async (req, res) => {
  try {
    const { id } = req.params;

    const vaccine = await Vaccine.findOne({ _id: id, userId: req.user._id });
    if (!vaccine) {
      return res.status(404).send({ error: 'Vaccin non trouvé ou non autorisé' });
    }

    await Vaccine.findOneAndDelete({ _id: id, userId: req.user._id });

    const history = new History({
      type: 'vaccine',
      data: { vaccineId: id, vaccineName: vaccine.name },
      userId: req.user._id,
      action: 'vaccine_deleted',
      description: `Vaccin ${vaccine.name} supprimé`
    });
    await history.save();

    res.send({ success: true, message: 'Vaccin supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du vaccin:', error);
    res.status(500).send({ error: error.message, message: 'Erreur lors de la suppression du vaccin' });
  }
};

// Exportation des fonctions du contrôleur
module.exports = {
  generateVaccinationSchedule,
  getVaccineSchedule,
  markVaccineAsAdministered,
  getUpcomingVaccines,
  getAdministeredVaccines,
  updateVaccine,
  deleteVaccine,
  sendManualReminder,
  updateNotificationPreferences,
  sendWeeklySummary,
  setupReminderCronJobs
};