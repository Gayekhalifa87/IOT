// Importation des dépendances
const History = require('../models/history.model');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Récupère l'historique avec des filtres optionnels pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getHistory = async (req, res) => {
    try {
        const { type, startDate, endDate, limit = 50, page = 1 } = req.query;
        let query = { userId: req.user._id }; // Filtrer par utilisateur connecté

        if (type) query.type = type;
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const skip = (page - 1) * limit;
        const history = await History.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        const total = await History.countDocuments(query);

        res.send({
            history,
            pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[HistoryController] Erreur dans getHistory:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la récupération de l\'historique' });
    }
};

/**
 * Récupère l'historique par type pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getHistoryByType = async (req, res) => {
    try {
        const { type } = req.params;
        const history = await History.find({ userId: req.user._id, type })
            .sort({ createdAt: -1 })
            .limit(50);
        res.send(history);
    } catch (error) {
        console.error('[HistoryController] Erreur dans getHistoryByType:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la récupération par type' });
    }
};

/**
 * Récupère les statistiques de l'historique pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getHistoryStats = async (req, res) => {
    try {
        const stats = await History.aggregate([
            { $match: { userId: req.user._id } }, // Filtrer par utilisateur
            { $group: { _id: '$type', count: { $sum: 1 }, lastAction: { $max: '$createdAt' } } }
        ]);
        res.send(stats);
    } catch (error) {
        console.error('[HistoryController] Erreur dans getHistoryStats:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la récupération des statistiques' });
    }
};

/**
 * Récupère l'historique pour un utilisateur spécifique (usage admin)
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getHistoryByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // TODO: Ajouter une vérification de rôle admin si nécessaire
        const history = await History.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.send(history);
    } catch (error) {
        console.error('[HistoryController] Erreur dans getHistoryByUser:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la récupération par utilisateur' });
    }
};

/**
 * Recherche dans l'historique par mot-clé pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const searchHistory = async (req, res) => {
    try {
        const { keyword } = req.query;
        const history = await History.find({
            userId: req.user._id,
            description: { $regex: keyword, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .limit(50);
        res.send(history);
    } catch (error) {
        console.error('[HistoryController] Erreur dans searchHistory:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la recherche dans l\'historique' });
    }
};

/**
 * Supprime une entrée de l'historique (si appartient à l'utilisateur)
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const deleteHistoryEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await History.findOneAndDelete({ _id: id, userId: req.user._id });
        if (!history) {
            return res.status(404).send({ error: 'Entrée non trouvée ou non autorisée' });
        }
        res.send(history);
    } catch (error) {
        console.error('[HistoryController] Erreur dans deleteHistoryEntry:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la suppression de l\'entrée' });
    }
};

/**
 * Récupère l'historique par jour pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getHistoryByDay = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let matchQuery = { userId: req.user._id };

        if (startDate && endDate) {
            matchQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const historyByDay = await History.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } },
                    entries: { $push: "$$ROOT" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
        ]);

        res.send(historyByDay);
    } catch (error) {
        console.error('[HistoryController] Erreur dans getHistoryByDay:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la récupération par jour' });
    }
};

/**
 * Récupère l'historique par semaine pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getHistoryByWeek = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let matchQuery = { userId: req.user._id };

        if (startDate && endDate) {
            matchQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const historyByWeek = await History.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { year: { $year: "$createdAt" }, week: { $week: "$createdAt" } },
                    entries: { $push: "$$ROOT" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.week": -1 } }
        ]);

        res.send(historyByWeek);
    } catch (error) {
        console.error('[HistoryController] Erreur dans getHistoryByWeek:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la récupération par semaine' });
    }
};

/**
 * Récupère l'historique par mois pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const getHistoryByMonth = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let matchQuery = { userId: req.user._id };

        if (startDate && endDate) {
            matchQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const historyByMonth = await History.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                    entries: { $push: "$$ROOT" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } }
        ]);

        res.send(historyByMonth);
    } catch (error) {
        console.error('[HistoryController] Erreur dans getHistoryByMonth:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de la récupération par mois' });
    }
};

/**
 * Exporte l'historique au format CSV pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const exportHistoryToCsv = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        let query = { userId: req.user._id };

        if (type) query.type = type;
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const history = await History.find(query).sort({ createdAt: -1 }).lean();
        const fields = [
            'type',
            'action',
            'description',
            { label: 'Date', value: 'createdAt', transform: (value) => new Date(value).toLocaleString() },
            { label: 'Données', value: 'data', transform: (value) => JSON.stringify(value) }
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(history);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=historique.csv');
        res.send(csv);
    } catch (error) {
        console.error('[HistoryController] Erreur dans exportHistoryToCsv:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de l\'export CSV' });
    }
};

/**
 * Exporte l'historique au format Excel pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const exportHistoryToExcel = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        let query = { userId: req.user._id };

        if (type) query.type = type;
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const history = await History.find(query).sort({ createdAt: -1 }).lean();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Historique');

        worksheet.columns = [
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Action', key: 'action', width: 20 },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Date', key: 'createdAt', width: 20 },
            { header: 'Données', key: 'data', width: 30 }
        ];

        history.forEach(record => {
            worksheet.addRow({
                type: record.type,
                action: record.action,
                description: record.description,
                createdAt: new Date(record.createdAt).toLocaleString(),
                data: JSON.stringify(record.data)
            });
        });

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=historique.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('[HistoryController] Erreur dans exportHistoryToExcel:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de l\'export Excel' });
    }
};

/**
 * Exporte l'historique au format PDF pour l'utilisateur connecté
 * @param {Object} req - Requête HTTP
 * @param {Object} res - Réponse HTTP
 */
const exportHistoryToPdf = async (req, res) => {
    try {
        const PDFDocument = require('pdfkit');
        const { type, startDate, endDate } = req.query;
        let query = { userId: req.user._id };

        if (type) query.type = type;
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const history = await History.find(query).sort({ createdAt: -1 }).lean();
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=historique.pdf');
        doc.pipe(res);

        const logoPath = path.join(__dirname, '../images/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 30, { width: 80 });
        } else {
            console.warn('Logo non trouvé à:', logoPath);
            doc.fontSize(10).fillColor('#ff0000').text('Logo non disponible', 50, 30);
        }

        doc.fontSize(20).fillColor('#2c3e50').text('Historique du Poulailler', 0, 80, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).fillColor('#7f8c8d').text('Filtres appliqués:', 50, 110, { underline: true });
        let filterY = 130;
        if (type) {
            doc.text(`Type: ${type}`, 50, filterY);
            filterY += 15;
        }
        if (startDate && endDate) {
            doc.text(`Période: du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`, 50, filterY);
        }
        doc.moveDown();

        const tableTop = filterY + 20;
        const typeX = 50;
        const descX = 150;
        const dataX = 300;
        const dateX = 450;
        const columnWidth = 150;
        const tableWidth = columnWidth * 4;

        doc.rect(50, tableTop, tableWidth, 20).fill('#3498db').stroke();
        doc.fontSize(12).fillColor('#ffffff')
            .text('Type', typeX, tableTop + 5, { width: columnWidth, align: 'center' })
            .text('Description', descX, tableTop + 5, { width: columnWidth, align: 'center' })
            .text('Données', dataX, tableTop + 5, { width: columnWidth, align: 'center' })
            .text('Date', dateX, tableTop + 5, { width: columnWidth, align: 'center' });

        let yPosition = tableTop + 20;
        history.forEach((record, index) => {
            if (yPosition > 700) {
                doc.addPage();
                yPosition = 50;

                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 50, 30, { width: 80 });
                } else {
                    doc.fontSize(10).fillColor('#ff0000').text('Logo non disponible', 50, 30);
                }

                doc.rect(50, yPosition, tableWidth, 20).fill('#3498db').stroke();
                doc.fontSize(12).fillColor('#ffffff')
                    .text('Type', typeX, yPosition + 5, { width: columnWidth, align: 'center' })
                    .text('Description', descX, yPosition + 5, { width: columnWidth, align: 'center' })
                    .text('Données', dataX, yPosition + 5, { width: columnWidth, align: 'center' })
                    .text('Date', dateX, yPosition + 5, { width: columnWidth, align: 'center' });
                yPosition += 20;
            }

            const rowColor = index % 2 === 0 ? '#ecf0f1' : '#ffffff';
            doc.rect(50, yPosition, tableWidth, 20).fill(rowColor).stroke();

            let description = record.description || '';
            if (description.length > 25) description = description.substring(0, 25) + '...';

            const dataStr = record.data ? JSON.stringify(record.data).substring(0, 20) + '...' : '';

            doc.fontSize(10).fillColor('#2c3e50')
                .text(record.type || '', typeX, yPosition + 5, { width: columnWidth, align: 'center' })
                .text(description, descX, yPosition + 5, { width: columnWidth, align: 'center' })
                .text(dataStr, dataX, yPosition + 5, { width: columnWidth, align: 'center' })
                .text(new Date(record.createdAt).toLocaleString('fr-FR'), dateX, yPosition + 5, { width: columnWidth, align: 'center' });

            yPosition += 20;
        });

        doc.fontSize(8).fillColor('#7f8c8d')
            .text(`Document généré le ${new Date().toLocaleString('fr-FR')}`, 0, doc.page.height - 50, { align: 'center', opacity: 0.7 });

        doc.end();
    } catch (error) {
        console.error('[HistoryController] Erreur dans exportHistoryToPdf:', error);
        res.status(500).send({ error: error.message || 'Erreur lors de l\'export PDF' });
    }
};

// Exportation des fonctions du contrôleur
module.exports = {
    getHistory,
    getHistoryByType,
    getHistoryStats,
    getHistoryByUser,
    searchHistory,
    deleteHistoryEntry,
    getHistoryByDay,
    getHistoryByWeek,
    getHistoryByMonth,
    exportHistoryToCsv,
    exportHistoryToExcel,
    exportHistoryToPdf
};