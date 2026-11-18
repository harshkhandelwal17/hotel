const express = require('express');
const { getUsers, createUser, deleteUser, updateStaffPassword } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Only admin and superadmin can manage users
router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .delete(deleteUser);

router.put('/:id/password', updateStaffPassword);

module.exports = router;
