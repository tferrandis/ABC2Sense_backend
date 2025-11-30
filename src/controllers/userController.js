// controllers/userController.js
const User = require('../models/user');

/**
 * @api {get} /api/user/users Get All Users
 * @apiName GetAllUsers
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiDescription Get paginated list of all users (Admin only)
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiQuery {Number} [page=1] Page number
 * @apiQuery {Number} [limit=10] Items per page
 *
 * @apiSuccess {Number} totalUsers Total number of users
 * @apiSuccess {Number} totalPages Total number of pages
 * @apiSuccess {Number} currentPage Current page number
 * @apiSuccess {Object[]} users Array of user objects
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "totalUsers": 50,
 *       "totalPages": 5,
 *       "currentPage": 1,
 *       "users": [
 *         {
 *           "_id": "507f1f77bcf86cd799439011",
 *           "username": "johndoe",
 *           "email": "john@example.com",
 *           "registrationDate": "2024-01-01T00:00:00.000Z"
 *         }
 *       ]
 *     }
 *
 * @apiError (401) Unauthorized User not authenticated
 * @apiError (403) Forbidden User is not an admin
 * @apiError (500) {String} message Error message
 */
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
