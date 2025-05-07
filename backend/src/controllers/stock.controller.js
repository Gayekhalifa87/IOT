const mongoose = require('mongoose');
const Stock = require('../models/stock.model');
const History = require('../models/history.model');
const Notification = require('../models/notification.model');
const EmailService = require('../services/emailService');
const { logAction } = require('../services/historyService');
const arduinoService = require('../services/arduinoService').instance;

/**
 * Ajoute un nouveau stock (uniquement pour les aliments, pas l'eau).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const addStock = async (req, res) => {
  try {
    if (!req.body.minQuantity) {
      return res.status(400).send({ message: 'Le champ minQuantity est requis.' });
    }
    if (req.body.type.toLowerCase() === "eau") {
      return res.status(400).send({ message: 'Les stocks d\'eau ne sont pas gérés manuellement, utilisez le capteur d\'eau.' });
    }
    const stock = new Stock({
      userId: req.user._id, // Ajout du userId
      ...req.body
    });
    await stock.save();
    await logAction(req.user._id, 'stock', 'stock_added', 
      `Stock ajouté: ${stock.quantity} ${stock.unit} de ${stock.type}`, {
        stockId: stock._id,
        quantity: stock.quantity,
        unit: stock.unit,
        type: stock.type,
      });
    const notification = new Notification({
      userId: req.user._id, // Ajout du userId
      message: `Nouveau stock ajouté: ${stock.quantity} ${stock.unit} de ${stock.type}`,
      type: 'stock_added'
    });
    await notification.save();
    console.log('Notification d\'ajout de stock enregistrée:', notification.message);
    res.status(201).send(stock);
  } catch (error) {
    console.error('[StockController] Error in addStock:', error);
    res.status(400).send({ error: error.message || 'Error adding stock' });
  }
};

/**
 * Récupère les statistiques du stock pour l'utilisateur connecté (uniquement pour les aliments).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getStockStats = async (req, res) => {
  try {
    const stats = await Stock.aggregate([
      { $match: { userId: req.user._id, type: { $ne: "eau" } } }, // Filtrer par userId
      {
        $group: {
          _id: '$type',
          totalQuantity: { $sum: '$quantity' },
          unit: { $first: '$unit' }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          totalQuantity: 1,
          unit: 1
        }
      }
    ]);
    await logAction(req.user._id, 'stock', 'stock_stats_viewed', 
      'Consultation des statistiques de stock', { stats });
    console.log('[StockController] Stock stats retrieved:', stats);
    res.send(stats);
  } catch (error) {
    console.error('[StockController] Error in getStockStats:', error);
    res.status(500).send({ error: error.message || 'Error retrieving stock stats' });
  }
};

/**
 * Met à jour un stock existant (uniquement pour les aliments, si appartient à l'utilisateur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const updateStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({ _id: req.params.id, userId: req.user._id });
    if (!stock) return res.status(404).send({ error: 'Stock not found or not authorized' });
    if (stock.type.toLowerCase() === "eau") {
      return res.status(400).send({ message: 'Les stocks d\'eau ne peuvent pas être mis à jour manuellement.' });
    }
    const updatedStock = await Stock.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    const history = new History({
      userId: req.user._id, // Ajout du userId
      type: 'stock',
      data: updatedStock,
      action: 'update',
      description: `Stock updated: ${updatedStock.quantity} ${updatedStock.unit} of ${updatedStock.type}`
    });
    await history.save();
    const notification = new Notification({
      userId: req.user._id, // Ajout du userId
      message: `Stock mis à jour: ${updatedStock.quantity} ${updatedStock.unit} de ${updatedStock.type}`,
      type: 'stock_updated'
    });
    await notification.save();
    console.log('Notification de mise à jour enregistrée:', notification.message);
    res.send(updatedStock);
  } catch (error) {
    console.error('[StockController] Error in updateStock:', error);
    res.status(400).send({ error: error.message || 'Error updating stock' });
  }
};

/**
 * Supprime un stock (uniquement pour les aliments, si appartient à l'utilisateur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({ _id: req.params.id, userId: req.user._id });
    if (!stock) return res.status(404).send({ error: 'Stock not found or not authorized' });
    if (stock.type.toLowerCase() === "eau") {
      return res.status(400).send({ message: 'Les stocks d\'eau ne peuvent pas être supprimés manuellement.' });
    }
    await EmailService.sendStockDeletedNotification(req.user, stock);
    await Stock.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    await logAction(req.user._id, 'stock', 'stock_deleted', 
      `Stock supprimé: ${stock.quantity} ${stock.unit} de ${stock.type}`, {
        stockId: stock._id,
        quantity: stock.quantity,
        unit: stock.unit,
        type: stock.type,
      });
    const notification = new Notification({
      userId: req.user._id, // Ajout du userId
      message: `Stock supprimé: ${stock.quantity} ${stock.unit} de ${stock.type}`,
      type: 'stock_deleted'
    });
    await notification.save();
    console.log('Notification de suppression enregistrée:', notification.message);
    res.send(stock);
  } catch (error) {
    console.error('[StockController] Error in deleteStock:', error);
    res.status(500).send({ error: error.message || 'Error deleting stock' });
  }
};

/**
 * Récupère tous les stocks de l'utilisateur connecté (uniquement pour les aliments).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getAllStocks = async (req, res) => {
  try {
    const stocks = await Stock.find({ userId: req.user._id, type: { $ne: "eau" } });
    await logAction(req.user._id, 'stock', 'all_stocks_viewed', 
      'Consultation de tous les stocks');
    console.log('[StockController] All stocks retrieved:', stocks);
    res.send(stocks);
  } catch (error) {
    console.error('[StockController] Error in getAllStocks:', error);
    res.status(500).send({ error: error.message || 'Error retrieving all stocks' });
  }
};

/**
 * Récupère les alertes de stock bas (inclut l'eau via capteur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getAlertLowStock = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).send({ message: 'Utilisateur non authentifié.' });
    }
    console.log('Données de l\'utilisateur req.user:', req.user);

    const { waterLevel, waterQuantity, isWaterSensorConnected } = await getWaterTankLevelData();
    const WATER_MIN_QUANTITY = 200;
    let alerts = [];

    if (!isWaterSensorConnected) {
      alerts.push({
        type: 'eau',
        currentStock: 0,
        unit: 'L',
        minQuantity: WATER_MIN_QUANTITY,
        error: 'Capteur d\'eau déconnecté'
      });
      console.log('[StockController] Water sensor disconnected, alert triggered');
    } else if (waterQuantity < WATER_MIN_QUANTITY) {
      alerts.push({
        type: 'eau',
        currentStock: waterQuantity,
        unit: 'L',
        minQuantity: WATER_MIN_QUANTITY
      });
      console.log('[StockController] Water level alert triggered:', { waterQuantity, WATER_MIN_QUANTITY });
    }

    const foodAlerts = await Stock.aggregate([
      { $match: { userId: req.user._id, type: { $ne: "eau" } } }, // Filtrer par userId
      {
        $group: {
          _id: '$type',
          currentStock: { $sum: '$quantity' },
          unit: { $first: '$unit' },
          minQuantity: { $first: '$minQuantity' }
        }
      },
      { $match: { $expr: { $lt: ['$currentStock', '$minQuantity'] } } },
      {
        $project: {
          _id: 0,
          type: '$_id',
          currentStock: 1,
          unit: 1,
          minQuantity: 1
        }
      }
    ]);
    alerts = [...alerts, ...foodAlerts];
    console.log('[StockController] All alerts retrieved:', alerts);
    if (!alerts || alerts.length === 0) {
      return res.status(404).send({ message: 'Aucune alerte de stock bas trouvée.' });
    }
    await logAction(req.user._id, 'stock', 'low_stock_alert_viewed', 
      'Consultation des alertes de stock bas', { alerts });
    for (const alert of alerts) {
      const userData = {
        email: req.user.email,
        username: req.user.username || 'Utilisateur',
        type: alert.type,
        currentStock: alert.currentStock,
        unit: alert.unit,
        threshold: alert.minQuantity || WATER_MIN_QUANTITY,
        error: alert.error
      };
      console.log('Données envoyées à sendLowStockAlert:', userData);
      await EmailService.sendLowStockAlert(userData);
    }
    res.send(alerts);
  } catch (error) {
    console.error('[StockController] Error in getAlertLowStock:', error);
    res.status(500).send({ message: 'Erreur serveur lors de la récupération des alertes.' });
  }
};

/**
 * Met à jour la quantité d'un stock (uniquement pour les aliments, si appartient à l'utilisateur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const updateStockQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityToRemove } = req.body;
    const stock = await Stock.findOne({ _id: id, userId: req.user._id });
    if (!stock) return res.status(404).send({ message: 'Stock non trouvé ou non autorisé.' });
    if (stock.type.toLowerCase() === "eau") {
      return res.status(400).send({ message: 'Les stocks d\'eau ne peuvent pas être mis à jour manuellement.' });
    }
    if (stock.quantity < quantityToRemove) {
      return res.status(400).send({ message: 'Quantité insuffisante en stock.' });
    }
    stock.quantity -= quantityToRemove;
    await stock.save();
    await logAction(req.user._id, 'stock', 'stock_quantity_updated', 
      `Quantité mise à jour: ${stock.quantity} ${stock.unit} de ${stock.type}`, {
        stockId: stock._id,
        quantity: stock.quantity,
        unit: stock.unit,
        type: stock.type,
      });
    console.log('[StockController] Stock quantity updated:', stock);
    res.send(stock);
  } catch (error) {
    console.error('[StockController] Error in updateStockQuantity:', error);
    res.status(500).send({ error: error.message || 'Error updating stock quantity' });
  }
};

/**
 * Récupère le niveau du réservoir d'aliments pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getFoodTankLevel = async (req, res) => {
  try {
    const totalCapacity = 1000;
    const stocks = await Stock.aggregate([
      { $match: { userId: req.user._id, type: { $ne: "eau" } } }, // Filtrer par userId
      { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
    ]);
    const totalQuantity = stocks.length > 0 ? stocks[0].totalQuantity : 0;
    const foodTankLevel = (totalQuantity / totalCapacity) * 100;
    await logAction(req.user._id, 'stock', 'food_tank_level_viewed', 
      'Consultation du niveau du réservoir d\'aliments', { foodTankLevel });
    console.log('[StockController] Food tank level retrieved:', foodTankLevel);
    res.send({ foodTankLevel });
  } catch (error) {
    console.error('[StockController] Error in getFoodTankLevel:', error);
    res.status(500).send({ error: error.message || 'Error retrieving food tank level' });
  }
};

/**
 * Récupère le niveau du réservoir d'eau en pourcentage via le capteur.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getWaterTankLevel = async (req, res) => {
  try {
    console.log('[StockController] Sending GET_STATUS command to Arduino for water level');
    const arduinoResponse = await arduinoService.sendCommand('GET_STATUS');
    const parsedData = JSON.parse(arduinoResponse);

    console.log('[StockController] Parsed JSON:', parsedData);

    const waterLevel = parsedData.waterLevel;
    const isMock = parsedData.isMock || false;
    const isWaterSensorConnected = !isMock;

    console.log('[StockController] Parsed values - Water Level:', waterLevel, 'Sensor Connected:', isWaterSensorConnected);

    const waterQuantity = waterLevel * 10;

    await logAction(req.user._id, 'stock', 'water_tank_level_viewed',
      "Consultation du niveau du réservoir d'eau", {
        timestamp: new Date(),
        user: req.user.username,
        waterLevel,
        waterQuantity,
        isWaterSensorConnected
      });

    const response = { waterLevel, waterQuantity, isWaterSensorConnected };
    console.log('[StockController] Water tank level retrieved:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('[StockController] Error retrieving water tank level:', error.message);
    res.status(500).json({ error: 'Error retrieving water tank level' });
  }
};

/**
 * Fonction utilitaire pour récupérer les données du niveau d'eau.
 */
async function getWaterTankLevelData() {
  console.log('[StockController] Sending GET_STATUS command to Arduino for water level');
  const statusResponse = await arduinoService.sendCommand("GET_STATUS");
  console.log('[StockController] Raw Arduino response:', statusResponse);

  let statusJson;
  try {
    statusJson = JSON.parse(statusResponse);
    console.log('[StockController] Parsed JSON:', statusJson);
  } catch (parseError) {
    console.error('[StockController] Error parsing Arduino response:', parseError.message);
    throw new Error('Erreur de parsing du niveau d\'eau depuis l\'Arduino');
  }

  const waterLevel = (statusJson.waterLevel !== undefined && typeof statusJson.waterLevel === 'number' && statusJson.waterLevel >= 0 && statusJson.waterLevel <= 100) 
    ? statusJson.waterLevel 
    : 0;
  const isWaterSensorConnected = statusJson.waterLevel !== undefined && typeof statusJson.waterLevel === 'number' && statusJson.waterLevel > 0 && statusJson.waterLevel <= 100;
  console.log('[StockController] Parsed values - Water Level:', waterLevel, 'Sensor Connected:', isWaterSensorConnected);

  const WATER_CAPACITY = 1000;
  const waterQuantity = isWaterSensorConnected ? (waterLevel / 100) * WATER_CAPACITY : 0;

  return { waterLevel, waterQuantity, isWaterSensorConnected };
}

/**
 * Récupère les quantités totales de feed et d'eau pour l'utilisateur connecté.
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getTotals = async (req, res) => {
  try {
    const foodStocks = await Stock.aggregate([
      { $match: { userId: req.user._id, type: { $ne: "eau" } } }, // Filtrer par userId
      {
        $group: {
          _id: '$type',
          totalQuantity: { $sum: '$quantity' },
          unit: { $first: '$unit' }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          totalQuantity: 1,
          unit: 1
        }
      }
    ]);
    const { waterQuantity, isWaterSensorConnected } = await getWaterTankLevelData();
    const totalsByType = {};
    foodStocks.forEach(item => {
      totalsByType[item.type] = { totalQuantity: item.totalQuantity, unit: item.unit };
    });
    totalsByType['eau'] = { 
      totalQuantity: waterQuantity, 
      unit: 'L',
      isWaterSensorConnected,
      error: !isWaterSensorConnected ? 'Capteur d\'eau déconnecté' : undefined 
    };
    await logAction(req.user._id, 'stock', 'totals_viewed', 
      'Consultation des quantités totales par type', { totalsByType });
    console.log('[StockController] Totals retrieved:', totalsByType);
    res.send({ totalsByType });
  } catch (error) {
    console.error('[StockController] Error in getTotals:', error);
    res.status(500).send({ error: error.message || 'Error retrieving totals' });
  }
};

/**
 * Récupère les stocks par type pour l'utilisateur connecté (uniquement pour les aliments).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getStocksByType = async (req, res) => {
  try {
    const { type } = req.params;
    if (type.toLowerCase() === "eau") {
      return res.status(400).send({ message: 'Les stocks d\'eau ne sont pas gérés manuellement.' });
    }
    const stocks = await Stock.find({ userId: req.user._id, type });
    if (!stocks || stocks.length === 0) {
      return res.status(404).send({ message: `Aucun stock de type ${type} trouvé.` });
    }
    await logAction(req.user._id, 'stock', 'stocks_by_type_viewed', 
      `Consultation des stocks de type ${type}`, { stocks });
    console.log('[StockController] Stocks by type retrieved:', stocks);
    res.send(stocks);
  } catch (error) {
    console.error('[StockController] Error in getStocksByType:', error);
    res.status(500).send({ error: error.message || 'Error retrieving stocks by type' });
  }
};

/**
 * Décrémente automatiquement la quantité d'un stock spécifique (si appartient à l'utilisateur).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const decrementStock = async (req, res) => {
  try {
    console.log('Requête de décrémentation reçue:', req.body);
    const { stockId, quantityToDecrement = 1 } = req.body;
    if (!stockId) {
      console.log('Erreur: L\'ID du stock est manquant dans la requête');
      return res.status(400).send({ message: 'L\'ID du stock est requis.' });
    }
    console.log(`Recherche du stock avec l'ID "${stockId}"...`);
    const stock = await Stock.findOne({ _id: stockId, userId: req.user._id });
    if (!stock) {
      console.log(`Aucun stock avec l'ID "${stockId}" n'a été trouvé ou n\'appartient pas à l\'utilisateur.`);
      return res.status(404).send({ message: `Aucun stock avec l'ID ${stockId} n'a été trouvé ou non autorisé.` });
    }
    if (stock.type.toLowerCase() === "eau") {
      return res.status(400).send({ message: 'Les stocks d\'eau ne peuvent pas être décrémentés manuellement.' });
    }
    console.log(`Stock trouvé: ID=${stock._id}, type=${stock.type}, quantité=${stock.quantity}`);
    if (stock.quantity < quantityToDecrement) {
      console.log(`Quantité insuffisante: disponible=${stock.quantity}, demandé=${quantityToDecrement}`);
      return res.status(400).send({
        message: 'Quantité insuffisante en stock.',
        currentStock: stock.quantity,
        requested: quantityToDecrement
      });
    }
    stock.quantity -= quantityToDecrement;
    await stock.save();
    console.log(`Stock décrémenté avec succès. Nouvelle quantité: ${stock.quantity}`);
    await logAction(req.user._id, 'stock', 'stock_decremented', 
      `Stock décrémenté automatiquement: ${quantityToDecrement} ${stock.unit} de ${stock.type}`, {
        stockId: stock._id,
        quantity: stock.quantity,
        quantityDecremented: quantityToDecrement,
        unit: stock.unit,
        type: stock.type,
      });
    console.log('Action enregistrée dans l\'historique');
    const notification = new Notification({
      userId: req.user._id, // Ajout du userId
      message: `Stock décrémenté: ${quantityToDecrement} ${stock.unit} de ${stock.type}`,
      type: 'stock_decremented'
    });
    await notification.save();
    console.log('Notification de décrémentation enregistrée:', notification.message);
    if (stock.quantity < stock.minQuantity) {
      const lowStockNotification = new Notification({
        userId: req.user._id, // Ajout du userId
        message: `Alerte: Le stock de ${stock.type} est bas (${stock.quantity} ${stock.unit})`,
        type: 'low_stock_alert',
        priority: 'high'
      });
      await lowStockNotification.save();
      console.log('Notification de stock bas enregistrée');
      await EmailService.sendLowStockAlert({
        email: req.user.email,
        username: req.user.username,
        type: stock.type,
        currentStock: stock.quantity,
        unit: stock.unit,
        threshold: stock.minQuantity
      });
      console.log('Email d\'alerte de stock bas envoyé');
    }
    console.log('[StockController] Stock decremented successfully:', { stock });
    res.send({
      message: 'Stock décrémenté avec succès',
      stock: { _id: stock._id, type: stock.type, quantity: stock.quantity, unit: stock.unit }
    });
  } catch (error) {
    console.error('[StockController] Error in decrementStock:', error);
    res.status(500).send({ message: 'Erreur lors de la décrémentation du stock', error: error.message });
  }
};

/**
 * Récupère un stock par son ID pour l'utilisateur connecté (uniquement pour les aliments).
 * @param {Object} req - Requête HTTP.
 * @param {Object} res - Réponse HTTP.
 */
const getStockById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'ID de stock invalide.' });
    }
    const stock = await Stock.findOne({ _id: id, userId: req.user._id });
    if (!stock) return res.status(404).send({ message: 'Stock non trouvé ou non autorisé.' });
    if (stock.type.toLowerCase() === "eau") {
      return res.status(400).send({ message: 'Les stocks d\'eau ne sont pas gérés manuellement.' });
    }
    await logAction(req.user._id, 'stock', 'stock_viewed', 
      `Consultation du stock: ${stock.quantity} ${stock.unit} de ${stock.type}`, {
        stockId: stock._id,
        quantity: stock.quantity,
        unit: stock.unit,
        type: stock.type,
      });
    console.log('[StockController] Stock by ID retrieved:', stock);
    res.send(stock);
  } catch (error) {
    console.error('[StockController] Error in getStockById:', error);
    res.status(500).send({ message: 'Erreur serveur lors de la récupération du stock.' });
  }
};

// Exportation des fonctions du contrôleur
module.exports = {
  addStock,
  getStockStats,
  updateStock,
  deleteStock,
  getAllStocks,
  getAlertLowStock,
  updateStockQuantity,
  getFoodTankLevel,
  getWaterTankLevel,
  getTotals,
  getStocksByType,
  decrementStock,
  getStockById
};