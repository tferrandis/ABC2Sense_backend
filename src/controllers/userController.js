// controllers/userController.js
const User = require('../models/user');

exports.getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const users = await User.find()
      .select('-password') // ocultar contraseñas
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ registrationDate: -1 });

    const totalUsers = await User.countDocuments();

    res.status(200).json({
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      users
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
};
