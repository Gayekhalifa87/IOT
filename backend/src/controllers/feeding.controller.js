const Feeding = require('../models/feeding.model');
const History = require('../models/history.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const EmailService = require('../services/emailService');
const { logAction } = require('../services/historyService');
const cron = require('node-cron');
const arduinoService = require('../services/arduinoService').instance;

/**
 * Ajoute une nouvelle alimentation.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const addFeeding = async (req, res) => {
  try {
    const { quantity, feedType, programStartTime, programEndTime } = req.body;
    if (!quantity || !feedType) {
      return res.status(400).send({ error: 'Quantity and feedType are required' });
    }

    const feeding = new Feeding({
      userId: req.user._id, // Ajout du userId de l'utilisateur connecté
      quantity,
      initialQuantity: quantity,
      consumedQuantity: 0,
      feedType,
      programStartTime,
      programEndTime,
      automaticFeeding: true,
    });

    await feeding.save();

    await logAction(req.user._id, 'feeding', 'feeding_added',
      `Alimentation ajoutée: ${feeding.quantity} de ${feeding.feedType}`, {
        feedingId: feeding._id,
        quantity: feeding.quantity,
        feedType: feeding.feedType,
      }
    );

    await arduinoService.syncTime();

    const newProgram = [{
      programStartTime: feeding.programStartTime,
      programEndTime: feeding.programEndTime,
      feedType: feeding.feedType,
      enabled: true,
    }];

    await arduinoService.sendPrograms(newProgram);
    console.log('[addFeeding] Program sent to Arduino:', newProgram);

    res.status(201).send(feeding);
  } catch (error) {
    console.error('Error in addFeeding:', error);
    res.status(400).send({ error: error.message || 'Error adding feeding' });
  }
};

/**
 * Récupère l'historique des alimentations pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getFeedingHistory = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    let query = { userId: req.user._id }; // Filtrer par userId

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const feedings = await Feeding.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    await logAction(req.user._id, 'feeding', 'feeding_history_viewed', 'Consultation de l\'historique des alimentations', {
      startDate,
      endDate,
      limit,
    });

    const now = new Date();
    feedings.forEach(async feeding => {
      const startTime = new Date(feeding.programStartTime);
      const diff = startTime - now;
      if (diff > 0 && diff <= 3600000) {
        const notification = new Notification({
          userId: req.user._id, // Associer la notification à l'utilisateur
          message: `L'alimentation programmée pour ${feeding.feedType} commence bientôt.`,
          type: 'feeding_reminder'
        });
        await notification.save();
        await EmailService.sendFeedingReminderNotification(req.user, feeding);
      }
    });

    res.send(feedings);
  } catch (error) {
    console.error('Error in getFeedingHistory:', error);
    res.status(500).send({ error: error.message || 'Error retrieving feeding history' });
  }
};

/**
 * Met à jour une alimentation existante (seulement si elle appartient à l'utilisateur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const updateFeeding = async (req, res) => {
  try {
    const updateData = req.body;

    const feeding = await Feeding.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, // Vérifier que l'alimentation appartient à l'utilisateur
      updateData,
      { new: true, runValidators: true }
    );

    if (!feeding) {
      return res.status(404).send({ error: 'Feeding not found or not authorized' });
    }

    await logAction(req.user._id, 'feeding', 'feeding_updated', `Alimentation mise à jour: ${feeding.quantity}kg de ${feeding.feedType}`, {
      feedingId: feeding._id,
      quantity: feeding.quantity,
      feedType: feeding.feedType,
    });

    const feedings = await Feeding.find({ userId: req.user._id, isArchived: false });
    await arduinoService.sendPrograms(feedings);

    res.send(feeding);
  } catch (error) {
    console.error('Error in updateFeeding:', error);
    res.status(400).send({ error: error.message || 'Error updating feeding' });
  }
};

/**
 * Archive une alimentation (seulement si elle appartient à l'utilisateur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const archiveFeeding = async (req, res) => {
  try {
    const feeding = await Feeding.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, // Vérifier l'appartenance
      { isArchived: true },
      { new: true }
    );

    if (!feeding) {
      return res.status(404).send({ error: 'Feeding not found or not authorized' });
    }

    await logAction(req.user._id, 'feeding', 'feeding_archived',
      `Alimentation archivée: ${feeding.quantity}kg de ${feeding.feedType}`, {
        feedingId: feeding._id,
        quantity: feeding.quantity,
        feedType: feeding.feedType,
      });

    const activeFeedings = await Feeding.find({ userId: req.user._id, isArchived: false });
    await arduinoService.sendPrograms(activeFeedings);
    console.log('[archiveFeeding] Programmes mis à jour (actifs uniquement) envoyés à l’Arduino');

    if (feeding.feedType === "Eau") {
      try {
        await arduinoService.sendCommand("STOP_WATER_IMMEDIATE");
        console.log('[archiveFeeding] Commande STOP_WATER_IMMEDIATE envoyée');
      } catch (commandError) {
        console.error('[archiveFeeding] Erreur lors de l’envoi de STOP_WATER_IMMEDIATE:', commandError.message);
      }
    } else {
      try {
        await arduinoService.sendCommand("STOP_FEEDING_IMMEDIATE");
        console.log('[archiveFeeding] Commande STOP_FEEDING_IMMEDIATE envoyée');
      } catch (commandError) {
        console.error('[archiveFeeding] Erreur lors de l’envoi de STOP_FEEDING_IMMEDIATE:', commandError.message);
      }
    }

    res.send(feeding);
  } catch (error) {
    console.error('Error in archiveFeeding:', error);
    res.status(500).send({ error: error.message || 'Error archiving feeding' });
  }
};

/**
 * Récupère les alimentations archivées de l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getArchivedFeedings = async (req, res) => {
  try {
    const feedings = await Feeding.find({ userId: req.user._id, isArchived: true });
    await logAction(req.user._id, 'feeding', 'archived_feedings_viewed', 'Consultation des alimentations archivées');
    res.send(feedings);
  } catch (error) {
    console.error('Error in getArchivedFeedings:', error);
    res.status(500).send({ error: error.message || 'Error retrieving archived feedings' });
  }
};

/**
 * Envoie les programmes à l'Arduino pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const sendProgramsToArduino = async (req, res) => {
  try {
    const feedings = await Feeding.find({ userId: req.user._id, isArchived: false });
    const programsToSend = feedings.map(program => ({
      programStartTime: program.programStartTime,
      programEndTime: program.programEndTime,
      feedType: program.feedType,
      enabled: true
    }));

    await arduinoService.sendPrograms(programsToSend);

    console.log('[sendProgramsToArduino] Programs sent to Arduino:', programsToSend);
    res.send({ message: 'Programs sent to Arduino successfully' });
  } catch (error) {
    console.error('Error in sendProgramsToArduino:', error);
    res.status(500).send({ error: error.message || 'Error sending programs to Arduino' });
  }
};

/**
 * Envoie une commande manuelle à l'Arduino.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const sendManualCommandToArduino = async (req, res) => {
  try {
    const { command } = req.body;
    await arduinoService.sendCommand(command);

    await logAction(req.user._id, 'arduino', 'manual_command_sent', `Commande manuelle envoyée: ${command}`);

    res.send({ message: `Command ${command} sent to Arduino successfully` });
  } catch (error) {
    console.error('Error in sendManualCommandToArduino:', error);
    res.status(500).send({ error: error.message || 'Error sending manual command to Arduino' });
  }
};

/**
 * Récupère les statistiques des alimentations de l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getFeedingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { userId: req.user._id };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await Feeding.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$feedType',
          totalQuantity: { $sum: '$quantity' },
          averageQuantity: { $avg: '$quantity' },
          count: { $sum: 1 },
        },
      },
    ]);

    await logAction(req.user._id, 'feeding', 'feeding_stats_viewed', 'Consultation des statistiques des alimentations', {
      startDate,
      endDate,
    });

    res.send(stats);
  } catch (error) {
    console.error('Error in getFeedingStats:', error);
    res.status(500).send({ error: error.message || 'Error retrieving feeding stats' });
  }
};

/**
 * Récupère les alertes de stock bas pour l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getAlertLowStock = async (req, res) => {
  try {
    const alerts = await Feeding.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$feedType',
          currentStock: { $sum: '$quantity' },
        },
      },
      {
        $match: {
          currentStock: { $lt: 100 },
        },
      },
    ]);

    await logAction(req.user._id, 'feeding', 'low_stock_alert_viewed', 'Consultation des alertes de stock bas', {
      alerts,
    });

    alerts.forEach(async (alert) => {
      const notification = new Notification({
        userId: req.user._id,
        message: `Stock bas: ${alert.currentStock} unités de ${alert._id}`,
        type: 'low_stock'
      });
      await notification.save();
      await EmailService.sendLowStockAlert(req.user, alert);
    });

    res.send(alerts);
  } catch (error) {
    console.error('Error in getAlertLowStock:', error);
    res.status(500).send({ error: error.message || 'Error retrieving low stock alerts' });
  }
};

/**
 * Ajoute plusieurs alimentations en une seule requête.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const bulkAddFeedings = async (req, res) => {
  try {
    if (!req.body.feedings || !Array.isArray(req.body.feedings)) {
      return res.status(400).send({ error: 'Incorrect data format. Expected: { feedings: [...] }' });
    }

    // Ajouter userId à chaque alimentation
    const feedingsWithUserId = req.body.feedings.map(feeding => ({
      ...feeding,
      userId: req.user._id
    }));

    const insertedFeedings = await Feeding.insertMany(feedingsWithUserId);

    await logAction(req.user._id, 'feeding', 'bulk_feedings_added', 'Ajout en masse des alimentations', {
      feedings: insertedFeedings,
    });

    res.status(201).send(insertedFeedings);
  } catch (error) {
    console.error('Error in bulkAddFeedings:', error);
    res.status(400).send({ error: error.message || 'Error bulk adding feedings' });
  }
};

/**
 * Met à jour l'apport en eau pour une alimentation.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const updateWaterSupply = async (req, res) => {
  try {
    const { startTime, endTime, enabled } = req.body;

    const feeding = await Feeding.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        waterSupply: { startTime, endTime, enabled },
      },
      { new: true, runValidators: true }
    );

    if (!feeding) {
      return res.status(404).send({ error: 'Feeding not found or not authorized' });
    }

    await logAction(req.user._id, 'feeding', 'water_supply_updated', `Apport en eau mis à jour: Début à ${startTime}, Fin à ${endTime}`, {
      feedingId: feeding._id,
      startTime,
      endTime,
      enabled,
    });

    res.send(feeding);
  } catch (error) {
    console.error('Error in updateWaterSupply:', error);
    res.status(400).send({ error: error.message || 'Error updating water supply' });
  }
};

/**
 * Liste toutes les alimentations actives de l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getAllFeedings = async (req, res) => {
  try {
    const feedings = await Feeding.find({ userId: req.user._id, isArchived: false });

    await logAction(req.user._id, 'feeding', 'all_feedings_viewed', 'Consultation de toutes les alimentations actives');

    res.send(feedings);
  } catch (error) {
    console.error('Error in getAllFeedings:', error);
    res.status(500).send({ error: error.message || 'Error retrieving all feedings' });
  }
};

/**
 * Décrémente la quantité d'une alimentation existante.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const decrementQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount = 1 } = req.body;

    if (amount <= 0) {
      return res.status(400).send({ error: 'La valeur de décrémentation doit être positive' });
    }

    const feeding = await Feeding.findOne({ _id: id, userId: req.user._id });
    
    if (!feeding) {
      return res.status(404).send({ error: 'Alimentation non trouvée ou non autorisée' });
    }
    
    if (feeding.quantity - amount < 0) {
      return res.status(400).send({ error: 'La quantité résultante ne peut pas être négative' });
    }

    feeding.quantity -= amount;
    feeding.consumedQuantity += amount;

    await feeding.save();

    await logAction(req.user._id, 'feeding', 'feeding_quantity_decremented',
      `Quantité d'alimentation décrémentée: -${amount} de ${feeding.feedType}`, {
        feedingId: feeding._id,
        decrementAmount: amount,
        newQuantity: feeding.quantity,
        consumedQuantity: feeding.consumedQuantity,
        feedType: feeding.feedType,
      }
    );

    if (feeding.quantity < 100) {
      const notification = new Notification({
        userId: req.user._id,
        message: `Stock bas: ${feeding.quantity} unités de ${feeding.feedType} après décrémentation`,
        type: 'low_stock'
      });
      await notification.save();
      await EmailService.sendLowStockAlert(req.user, {
        _id: feeding.feedType,
        currentStock: feeding.quantity
      });
    }

    res.send(feeding);
  } catch (error) {
    console.error('Error in decrementQuantity:', error);
    res.status(400).send({ error: error.message || 'Erreur lors de la décrémentation de la quantité' });
  }
};

/**
 * Récupère les statistiques de consommation pour l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getConsumptionStats = async (req, res) => {
  try {
    const stats = await Feeding.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: '$feedType',
          totalConsumed: { $sum: '$consumedQuantity' },
          totalInitial: { $sum: '$initialQuantity' },
          remainingQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    res.send(stats);
  } catch (error) {
    console.error('Error in getConsumptionStats:', error);
    res.status(500).send({ error: error.message || 'Error retrieving consumption stats' });
  }
};

/**
 * Vérifie les rappels d'alimentation pour tous les utilisateurs.
 */
const checkFeedingReminders = async () => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 3600000);
    const nowHours = String(now.getUTCHours()).padStart(2, '0');
    const nowMinutes = String(now.getUTCMinutes()).padStart(2, '0');
    const nowTimeStr = `${nowHours}:${nowMinutes}`;

    const upcomingFeedings = await Feeding.find({
      programStartTime: {
        $gte: nowTimeStr,
        $lte: oneHourLater.toISOString().slice(11, 16)
      },
      reminderSent: { $ne: true }
    });

    const activeFeedings = await Feeding.find({
      programStartTime: { $lte: nowTimeStr },
      programEndTime: { $gt: nowTimeStr },
      reminderSent: { $ne: true }
    });

    console.log(`Checked feeding reminders at ${now}. Found ${upcomingFeedings.length} upcoming feedings and ${activeFeedings.length} active feedings.`);

    for (const feeding of upcomingFeedings) {
      try {
        const user = await User.findById(feeding.userId);
        if (user) {
          const notification = new Notification({
            userId: user._id,
            message: `L'alimentation programmée pour ${feeding.feedType} commence bientôt à ${feeding.programStartTime}.`,
            type: 'feeding_reminder',
          });
          await notification.save();
          await EmailService.sendFeedingReminderNotification(user, feeding);
          feeding.reminderSent = true;
          await feeding.save();
        }
      } catch (feedingError) {
        console.error(`Error processing feeding ${feeding._id}:`, feedingError);
      }
    }

    for (const feeding of activeFeedings) {
      try {
        const user = await User.findById(feeding.userId);
        if (user) {
          const notification = new Notification({
            userId: user._id,
            message: `L'alimentation ${feeding.feedType} est en cours (de ${feeding.programStartTime} à ${feeding.programEndTime}).`,
            type: 'feeding_active',
          });
          await notification.save();
          feeding.reminderSent = true;
          await feeding.save();
        }
      } catch (feedingError) {
        console.error(`Error processing active feeding ${feeding._id}:`, feedingError);
      }
    }
  } catch (error) {
    console.error('Error in checkFeedingReminders:', error);
  }
};

/**
 * Configure les tâches cron pour les rappels d'alimentation.
 */
const setupFeedingReminderCronJobs = () => {
  cron.schedule('* * * * *', () => {
    checkFeedingReminders();
  });
  console.log('Feeding reminder cron jobs have been set up.');
};

/**
 * Récupère les programmes d'alimentation avec leurs stocks associés pour l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getFeedingProgramWithStock = async (req, res) => {
  try {
    const feedings = await Feeding.aggregate([
      { $match: { userId: req.user._id } },
      {
        $lookup: {
          from: 'stocks',
          localField: 'stockId',
          foreignField: '_id',
          as: 'stock'
        }
      },
      {
        $unwind: {
          path: '$stock',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          quantity: 1,
          feedType: 1,
          programStartTime: 1,
          programEndTime: 1,
          notes: 1,
          automaticFeeding: 1,
          stockQuantity: '$stock.quantity',
          stockId: '$stock._id'
        }
      }
    ]);

    await logAction(
      req.user._id,
      'feeding',
      'feeding_program_with_stock_viewed',
      'Consultation des programmes d\'alimentation avec leurs stocks',
      { timestamp: new Date() }
    );

    res.send(feedings);
  } catch (error) {
    console.error('Error in getFeedingProgramWithStock:', error);
    res.status(500).send({ error: error.message || 'Error retrieving feeding programs with stock' });
  }
};

/**
 * Arrête immédiatement la pompe à eau via l'Arduino.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const stopWaterImmediate = async (req, res) => {
  try {
    await arduinoService.sendCommand("STOP_WATER_IMMEDIATE");
    console.log('[stopWaterImmediate] Commande STOP_WATER_IMMEDIATE envoyée à l’Arduino');

    await logAction(
      req.user._id,
      'feeding',
      'water_stopped_immediate',
      'Arrêt immédiat de la pompe à eau',
      { timestamp: new Date() }
    );

    res.send({ message: 'Pompe à eau arrêtée immédiatement' });
  } catch (error) {
    console.error('Error in stopWaterImmediate:', error);
    res.status(500).send({ error: error.message || 'Erreur lors de l’arrêt immédiat de la pompe' });
  }
};

/**
 * Arrête immédiatement le servomoteur pour la nourriture.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const stopFeedingImmediate = async (req, res) => {
  try {
    await arduinoService.sendCommand("STOP_FEEDING_IMMEDIATE");
    console.log('[stopFeedingImmediate] Commande STOP_FEEDING_IMMEDIATE envoyée à l’Arduino');

    await logAction(
      req.user._id,
      'feeding',
      'feeding_stopped_immediate',
      'Arrêt immédiat du servomoteur pour la nourriture',
      { timestamp: new Date() }
    );

    res.send({ message: 'Servomoteur pour la nourriture arrêté immédiatement' });
  } catch (error) {
    console.error('Error in stopFeedingImmediate:', error);
    res.status(500).send({ error: error.message || 'Erreur lors de l’arrêt immédiat du servomoteur' });
  }
};

/**
 * Récupère la quantité d'aliments consommés pour l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getConsumedFood = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { userId: req.user._id, feedType: 'Aliment' };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await Feeding.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalConsumed: { $sum: '$consumedQuantity' },
        },
      },
    ]);

    const totalConsumed = stats.length > 0 ? stats[0].totalConsumed : 0;

    await logAction(req.user._id, 'feeding', 'consumed_food_viewed', 'Consultation de la quantité d\'aliments consommés', {
      startDate,
      endDate,
      totalConsumed,
    });

    res.send({ feedType: 'Aliment', totalConsumed, unit: 'kg' });
  } catch (error) {
    console.error('Error in getConsumedFood:', error);
    res.status(500).send({ error: error.message || 'Error retrieving consumed food quantity' });
  }
};

/**
 * Récupère la quantité d'eau consommée pour l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getConsumedWater = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { userId: req.user._id, feedType: 'Eau' };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await Feeding.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalConsumed: { $sum: '$consumedQuantity' },
        },
      },
    ]);

    const totalConsumed = stats.length > 0 ? stats[0].totalConsumed : 0;

    await logAction(req.user._id, 'feeding', 'consumed_water_viewed', 'Consultation de la quantité d\'eau consommée', {
      startDate,
      endDate,
      totalConsumed,
    });

    res.send({ feedType: 'Eau', totalConsumed, unit: 'L' });
  } catch (error) {
    console.error('Error in getConsumedWater:', error);
    res.status(500).send({ error: error.message || 'Error retrieving consumed water quantity' });
  }
};

/**
 * Récupère la quantité totale distribuée pour l'utilisateur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getDistributionQuantity = async (req, res) => {
  try {
    const { feedType, startDate, endDate } = req.query;
    let query = { userId: req.user._id };

    if (feedType) {
      query.feedType = feedType;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await Feeding.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$feedType',
          totalDistributed: { $sum: '$quantity' },
        },
      },
    ]);

    let response;
    if (feedType) {
      const filteredStat = stats.find(stat => stat._id === feedType);
      response = filteredStat ? {
        feedType,
        totalDistributed: filteredStat.totalDistributed,
        unit: feedType === 'Aliment' ? 'kg' : 'L'
      } : { feedType, totalDistributed: 0, unit: feedType === 'Aliment' ? 'kg' : 'L' };
    } else {
      response = stats.map(stat => ({
        feedType: stat._id,
        totalDistributed: stat.totalDistributed,
        unit: stat._id === 'Aliment' ? 'kg' : 'L',
      }));
    }

    await logAction(req.user._id, 'feeding', 'distribution_quantity_viewed', 'Consultation de la quantité distribuée', {
      feedType,
      startDate,
      endDate,
      response,
    });

    res.send(response);
  } catch (error) {
    console.error('Error in getDistributionQuantity:', error);
    res.status(500).send({ error: error.message || 'Error retrieving distribution quantity' });
  }
};

// Exporter les fonctions du contrôleur
module.exports = {
  addFeeding,
  getFeedingHistory,
  updateFeeding,
  archiveFeeding,
  getArchivedFeedings,
  getFeedingStats,
  getAlertLowStock,
  bulkAddFeedings,
  updateWaterSupply,
  getAllFeedings,
  decrementQuantity,
  getConsumptionStats,
  checkFeedingReminders,
  setupFeedingReminderCronJobs,
  getFeedingProgramWithStock,
  sendProgramsToArduino,
  sendManualCommandToArduino,
  stopWaterImmediate,
  stopFeedingImmediate,
  getConsumedFood,
  getConsumedWater,
  getDistributionQuantity
};