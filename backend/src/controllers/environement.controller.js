const EnvironmentModel = require('../models/environementData.model');
const arduinoService = require('../services/arduinoService').instance;
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'votre-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'votre-mot-de-passe'
  }
});

const ALERT_THRESHOLDS = {
  temperature: { min: 5, max: 35 },
  humidity: { min: 30, max: 70 },
  lightLevel: { min: 10, max: 90 }
};

let lastAlertSent = null;
const ALERT_COOLDOWN = 3600000; // 1 heure en millisecondes
const SAVE_INTERVAL = 7 * 60 * 60 * 1000; // 7 heures

async function saveEnvironmentData(data) {
  try {
    const environmentData = new EnvironmentModel({
      temperature: data.temperature || 0,
      humidity: data.humidity || 0,
      lightRaw: data.lightLevel || 0,
      lightPercentage: data.lightLevel || 0,
      timestamp: new Date()
    });

    await environmentData.save();
    console.log('Données environnementales enregistrées avec succès:', {
      temperature: environmentData.temperature,
      humidity: environmentData.humidity,
      lightLevel: environmentData.lightPercentage
    });
  } catch (error) {
    console.error(`Erreur sauvegarde des données: ${error.message}`);
  }
}

function checkAlertThresholds(data) {
  const now = new Date();
  if (lastAlertSent && (now - lastAlertSent) < ALERT_COOLDOWN) return;

  const alerts = [];

  if (data.temperature !== undefined) {
    if (data.temperature < ALERT_THRESHOLDS.temperature.min) {
      alerts.push(`Température trop basse: ${data.temperature}°C (min: ${ALERT_THRESHOLDS.temperature.min}°C)`);
    } else if (data.temperature > ALERT_THRESHOLDS.temperature.max) {
      alerts.push(`Température trop élevée: ${data.temperature}°C (max: ${ALERT_THRESHOLDS.temperature.max}°C)`);
    }
  }

  if (data.humidity !== undefined) {
    if (data.humidity < ALERT_THRESHOLDS.humidity.min) {
      alerts.push(`Humidité trop basse: ${data.humidity}% (min: ${ALERT_THRESHOLDS.humidity.min}%)`);
    } else if (data.humidity > ALERT_THRESHOLDS.humidity.max) {
      alerts.push(`Humidité trop élevée: ${data.humidity}% (max: ${ALERT_THRESHOLDS.humidity.max}%)`);
    }
  }

  if (data.lightLevel !== undefined) {
    if (data.lightLevel < ALERT_THRESHOLDS.lightLevel.min) {
      alerts.push(`Luminosité trop basse: ${data.lightLevel}% (min: ${ALERT_THRESHOLDS.lightLevel.min}%)`);
    } else if (data.lightLevel > ALERT_THRESHOLDS.lightLevel.max) {
      alerts.push(`Luminosité trop élevée: ${data.lightLevel}% (max: ${ALERT_THRESHOLDS.lightLevel.max}%)`);
    }
  }

  if (alerts.length > 0) {
    sendAlertEmail(alerts);
    lastAlertSent = now;
  }
}

function sendAlertEmail(alerts) {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'votre-email@gmail.com',
    to: process.env.ALERT_EMAIL || 'votre-email@gmail.com',
    subject: 'Alerte poulailler automatisé',
    text: `Les conditions suivantes requièrent votre attention:\n\n${alerts.join('\n')}\n\nDate: ${new Date().toLocaleString()}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erreur envoi email:', error);
    } else {
      console.log('Email d\'alerte envoyé:', info.response);
    }
  });
}

arduinoService.on('data', async (data) => {
  try {
    await saveEnvironmentData(data);
    checkAlertThresholds(data);
  } catch (error) {
    console.error(`Erreur traitement des données: ${error.message}`);
  }
});

arduinoService.on('error', (err) => {
  console.error('Erreur Arduino:', err.message);
});

arduinoService.on('parse_error', ({ error, rawData }) => {
  console.error(`Erreur de parsing: ${error.message}`, 'Données brutes:', rawData);
});

function startSaveInterval() {
  setInterval(async () => {
    try {
      const latestData = arduinoService.getLatestData();
      if (latestData && !latestData.isMock && latestData.timestamp && (new Date() - new Date(latestData.timestamp)) < 60000) {
        await saveEnvironmentData(latestData);
        console.log('Données enregistrées toutes les 7 heures:', {
          temperature: latestData.temperature,
          humidity: latestData.humidity,
          lightLevel: latestData.lightLevel
        });
      } else {
        console.log('Aucune donnée disponible pour l\'enregistrement');
        await arduinoService.sendCommand('GET_STATUS');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement périodique:', error);
    }
  }, SAVE_INTERVAL);
}

startSaveInterval();

exports.getLatestEnvironmentData = async (req, res) => {
  try {
    const latestData = arduinoService.getLatestData() || await EnvironmentModel.findOne().sort({ timestamp: -1 });
    if (!latestData) {
      return res.status(200).json({ message: 'Aucune donnée disponible' });
    }
    if (latestData.isMock) {
      return res.status(200).json({ message: 'Mode mock actif, données non réelles', ...latestData });
    }
    res.status(200).json({
      temperature: latestData.temperature,
      humidity: latestData.humidity,
      lightLevel: latestData.lightLevel,
      timestamp: latestData.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEnvironmentHistory = async (req, res) => {
  try {
    const { limit = 24 } = req.query;
    const history = await EnvironmentModel.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('temperature humidity lightPercentage timestamp');

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};