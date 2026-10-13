const Hostel = require('../models/Hostel');

const userId = (user) => user.id || user._id;

/**
 * Whether the logged-in user may access the given hostel.
 */
const userCanAccessHostel = async (user, hostelId) => {
  if (!user || !hostelId) return false;
  const id = hostelId.toString();

  if (user.role === 'superadmin') return true;

  if (user.role === 'admin') {
    return !!(await Hostel.exists({ _id: id, owner: userId(user) }));
  }

  if (user.assignedHostel) {
    return user.assignedHostel.toString() === id;
  }

  return false;
};

/**
 * Throw 403 if user cannot access hostel.
 */
const assertHostelAccess = async (user, hostelId, requireActive = false) => {
  const ok = await userCanAccessHostel(user, hostelId);
  if (!ok) {
    const err = new Error('Not authorized for this property');
    err.statusCode = 403;
    throw err;
  }
  if (requireActive && user.role !== 'superadmin') {
    const hostel = await Hostel.findById(hostelId);
    if (hostel && hostel.isActive === false) {
      const err = new Error('This property is currently locked or inactive. Please contact Super Admin to activate subscription.');
      err.statusCode = 403;
      throw err;
    }
  }
};

/**
 * Build a Stay/Guest/Payment hostel filter for list endpoints.
 * Optional queryHostel (string | 'all') narrows further for admin/superadmin.
 */
const getHostelFilter = async (user, queryHostel) => {
  if (user.role === 'superadmin') {
    if (queryHostel && queryHostel !== 'all') {
      return { hostel: queryHostel };
    }
    return {};
  }

  if (user.role === 'admin') {
    const myHostels = await Hostel.find({ owner: userId(user) }).select('_id');
    const hostelIds = myHostels.map((h) => h._id);

    if (queryHostel && queryHostel !== 'all') {
      if (!hostelIds.some((id) => id.toString() === queryHostel.toString())) {
        const err = new Error('Not authorized');
        err.statusCode = 403;
        throw err;
      }
      return { hostel: queryHostel };
    }

    return { hostel: { $in: hostelIds } };
  }

  return { hostel: user.assignedHostel };
};

module.exports = {
  userCanAccessHostel,
  assertHostelAccess,
  getHostelFilter,
  userId
};
