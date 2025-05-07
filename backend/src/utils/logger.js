// utils/logger.js
const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

// Format personnalisé pour les logs
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Configuration des transports (sorties des logs)
const transports = [
  new winston.transports.Console({
    format: combine(
      colorize(), // Ajoute des couleurs pour les logs dans la console
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error', // Seuls les logs de niveau "error" seront écrits ici
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  }),
  new winston.transports.File({
    filename: 'logs/combined.log', // Tous les logs seront écrits ici
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  }),
];

// Création du logger
const logger = winston.createLogger({
  level: 'info', // Niveau de log par défaut
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports,
});

module.exports = logger;