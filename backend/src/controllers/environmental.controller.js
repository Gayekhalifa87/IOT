const Lamp = require('../models/lamp.model');
const History = require('../models/history.model');
const arduinoService = require('../services/arduinoService').instance;

/**
 * Programme l'allumage automatique de la lampe entre deux horaires pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const scheduleLightingControl = async (req, res) => {
  try {
    const { startTime, endTime, enabled = true } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).send({ error: 'Veuillez spécifier les heures de début et de fin' });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).send({ error: 'Le format des heures doit être HH:MM (ex: 08:30)' });
    }

    let lamp = await Lamp.findOne({ userId: req.user._id });
    if (!lamp) {
      lamp = new Lamp({
        userId: req.user._id,
        status: false,
        autoMode: { enabled: false, lightThreshold: 30 },
        lastUpdated: Date.now()
      });
    }

    lamp.schedule = { enabled, startTime, endTime };
    await lamp.save();

    await arduinoService.sendLampSchedule(lamp.schedule);

    const history = new History({
      type: 'schedule',
      data: { device: 'lighting', lampId: lamp._id, startTime, endTime, enabled },
      userId: req.user._id,
      action: 'schedule_lighting',
      description: `Programmation éclairage: ${startTime}-${endTime}, ${enabled ? 'activée' : 'désactivée'}`
    });
    await history.save();

    res.status(200).send({
      success: true,
      message: `Programmation de l'éclairage configurée: ${startTime}-${endTime}`,
      details: { lamp: { id: lamp._id, schedule: lamp.schedule } }
    });
  } catch (error) {
    console.error('[LampController] Erreur dans scheduleLightingControl:', error);
    res.status(500).send({ error: error.message || 'Erreur lors de la programmation de l\'éclairage' });
  }
};

/**
 * Récupère la programmation de la lampe pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getLightSchedule = async (req, res) => {
  try {
    const lamp = await Lamp.findOne({ userId: req.user._id });
    if (!lamp) {
      return res.status(404).send({ error: 'Aucune lampe trouvée pour cet utilisateur' });
    }

    res.status(200).send({ success: true, data: lamp.schedule });
  } catch (error) {
    console.error('[LampController] Erreur dans getLightSchedule:', error);
    res.status(500).send({ error: error.message || 'Erreur lors de la récupération de la programmation' });
  }
};

/**
 * Supprime la programmation de la lampe pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const deleteLightSchedule = async (req, res) => {
  try {
    const lamp = await Lamp.findOne({ userId: req.user._id });
    if (!lamp) {
      return res.status(404).send({ error: 'Aucune lampe trouvée pour cet utilisateur' });
    }

    const disabledSchedule = { enabled: false, startTime: null, endTime: null };
    lamp.schedule = disabledSchedule;
    lamp.lastUpdated = new Date();
    await lamp.save();

    await arduinoService.sendLampSchedule(disabledSchedule);

    const history = new History({
      type: 'schedule',
      data: { device: 'lighting', lampId: lamp._id, startTime: null, endTime: null, enabled: false },
      userId: req.user._id,
      action: 'delete_lighting_schedule',
      description: 'Programmation éclairage supprimée'
    });
    await history.save();

    res.status(200).send({
      success: true,
      message: 'Programmation de l\'éclairage supprimée',
      details: { lamp: { id: lamp._id, schedule: lamp.schedule, lastUpdated: lamp.lastUpdated } }
    });
  } catch (error) {
    console.error('[LampController] Erreur dans deleteLightSchedule:', error);
    res.status(500).send({ error: error.message || 'Erreur lors de la suppression de la programmation' });
  }
};

/**
 * Récupère les préférences de jour pour la lampe de l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getLightPreferences = async (req, res) => {
  try {
    const lamp = await Lamp.findOne({ userId: req.user._id });
    if (!lamp) {
      return res.status(404).send({ error: 'Aucune lampe trouvée pour cet utilisateur' });
    }

    res.status(200).send({ success: true, data: lamp.activeDays });
  } catch (error) {
    console.error('[LampController] Erreur dans getLightPreferences:', error);
    res.status(500).send({ error: error.message || 'Erreur lors de la récupération des préférences' });
  }
};

/**
 * Met à jour les préférences de jour pour la lampe de l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const updateLightPreferences = async (req, res) => {
  try {
    const { activeDays } = req.body;
    if (!activeDays || !Array.isArray(activeDays)) {
      return res.status(400).send({ error: 'Veuillez spécifier un tableau de jours actifs' });
    }

    const lamp = await Lamp.findOne({ userId: req.user._id });
    if (!lamp) {
      return res.status(404).send({ error: 'Aucune lampe trouvée pour cet utilisateur' });
    }

    lamp.activeDays = activeDays;
    await lamp.save();

    res.status(200).send({
      success: true,
      message: 'Préférences de jour mises à jour',
      data: lamp.activeDays
    });
  } catch (error) {
    console.error('[LampController] Erreur dans updateLightPreferences:', error);
    res.status(500).send({ error: error.message || 'Erreur lors de la mise à jour des préférences' });
  }
};

/**
 * Contrôle manuel de la lampe (allumer/éteindre) pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const controlLampManually = async (req, res) => {
  try {
    const { action } = req.body;
    if (!['START', 'STOP'].includes(action)) {
      return res.status(400).send({ error: 'Action doit être "START" ou "STOP"' });
    }

    const command = action === 'START' ? 'START_LAMP' : 'STOP_LAMP';
    await arduinoService.sendCommand(command);

    let lamp = await Lamp.findOne({ userId: req.user._id });
    if (!lamp) {
      lamp = new Lamp({
        userId: req.user._id,
        status: false,
        autoMode: { enabled: false, lightThreshold: 30 },
        lastUpdated: Date.now()
      });
    }

    lamp.status = action === 'START';
    lamp.lastUpdated = Date.now();
    await lamp.save();

    const history = new History({
      type: 'manual',
      data: { device: 'lighting', lampId: lamp._id, action },
      userId: req.user._id,
      action: `manual_lighting_${action.toLowerCase()}`,
      description: `Lampe ${action === 'START' ? 'allumée' : 'éteinte'} manuellement`
    });
    await history.save();

    res.status(200).send({
      success: true,
      message: `Lampe ${action === 'START' ? 'allumée' : 'éteinte'} manuellement`
    });
  } catch (error) {
    console.error('[LampController] Erreur dans controlLampManually:', error);
    res.status(500).send({ error: error.message || 'Erreur lors du contrôle manuel' });
  }
};

// Exportation des fonctions du contrôleur
module.exports = {
  scheduleLightingControl,
  getLightSchedule,
  deleteLightSchedule,
  getLightPreferences,
  updateLightPreferences,
  controlLampManually
};