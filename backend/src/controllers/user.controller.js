const User = require('../models/user.model');
const { sendEmail } = require('../utils/mailer');

// Récupération de tous les utilisateurs avec filtres et pagination
const getUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            role,
            search,
            status,
            startDate,
            endDate
        } = req.query;

        const query = {};

        // Filtre par rôle
        if (role) {
            query.role = role;
        }

        // Filtre par statut
        if (status) {
            query.status = status;
        }

        // Filtre par date de création
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Recherche textuelle
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.send({
            users,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).send({
            error: 'Erreur lors de la récupération des utilisateurs',
            details: error.message
        });
    }
};

// Récupération d'un utilisateur par ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).send({ error: 'Utilisateur non trouvé' });
        }
        res.send(user);
    } catch (error) {
        res.status(500).send({
            error: 'Erreur lors de la récupération de l\'utilisateur',
            details: error.message
        });
    }
};

// Mise à jour d'un utilisateur
const updateUser = async (req, res) => {
    try {
        const updates = req.body;
        const userId = req.params.id;

        // Vérifier si l'email/username est déjà utilisé
        if (updates.email || updates.username) {
            const existingUser = await User.findOne({
                _id: { $ne: userId },
                $or: [
                    { email: updates.email },
                    { username: updates.username }
                ]
            });

            if (existingUser) {
                return res.status(400).send({
                    error: 'Email ou username déjà utilisé'
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).send({ error: 'Utilisateur non trouvé' });
        }

        res.send(user);
    } catch (error) {
        res.status(400).send({
            error: 'Erreur lors de la mise à jour de l\'utilisateur',
            details: error.message
        });
    }
};

// Suppression d'un utilisateur
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).send({ error: 'Utilisateur non trouvé' });
        }
        res.send({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        res.status(500).send({
            error: 'Erreur lors de la suppression de l\'utilisateur',
            details: error.message
        });
    }
};

// Mise à jour du statut d'un utilisateur
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).send({ error: 'Utilisateur non trouvé' });
        }

        res.send(user);
    } catch (error) {
        res.status(400).send({
            error: 'Erreur lors de la mise à jour du statut',
            details: error.message
        });
    }
};

// Mise à jour du rôle d'un utilisateur
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).send({ error: 'Utilisateur non trouvé' });
        }

        res.send(user);
    } catch (error) {
        res.status(400).send({
            error: 'Erreur lors de la mise à jour du rôle',
            details: error.message
        });
    }
};

// Recherche avancée d'utilisateurs
const searchUsers = async (req, res) => {
    try {
        const {
            search,
            role,
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) query.role = role;
        if (status) query.status = status;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.send({
            users,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).send({
            error: 'Erreur lors de la recherche d\'utilisateurs',
            details: error.message
        });
    }
};

// Statistiques des utilisateurs
const getUserStats = async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    activeUsers: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                        }
                    },
                    adminUsers: {
                        $sum: {
                            $cond: [{ $eq: ['$role', 'admin'] }, 1, 0]
                        }
                    },
                    averageAge: { $avg: '$age' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalUsers: 1,
                    activeUsers: 1,
                    adminUsers: 1,
                    averageAge: { $round: ['$averageAge', 1] }
                }
            }
        ]);

        const roleDistribution = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statusDistribution = await User.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.send({
            general: stats[0],
            roleDistribution,
            statusDistribution
        });
    } catch (error) {
        res.status(500).send({
            error: 'Erreur lors de la récupération des statistiques',
            details: error.message
        });
    }
};

module.exports = {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    updateUserStatus,
    updateUserRole,
    searchUsers,
    getUserStats
};