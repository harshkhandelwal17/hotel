const {
  getRooms, getRoom, createRoom, updateRoom, deleteRoom,
  startMaintenance, endMaintenance, updateHousekeeping
} = require('../controllers/roomController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRooms)
  .post(authorize('admin'), createRoom);

// Staff and admin can manage maintenance and housekeeping
router.post('/:id/maintenance', startMaintenance);
router.post('/:id/maintenance/resolve', endMaintenance);
router.patch('/:id/housekeeping', updateHousekeeping);

router.route('/:id')
  .get(getRoom)
  .put(authorize('admin'), updateRoom)
  .delete(authorize('admin'), deleteRoom);

module.exports = router;
