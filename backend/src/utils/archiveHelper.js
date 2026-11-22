const DeletedArchive = require('../models/DeletedArchive');

/**
 * Safely archive a deleted document before physical removal.
 * 
 * @param {Object} params
 * @param {string} params.modelName - 'Stay', 'Payment', 'Expense', 'Room'
 * @param {Object} params.originalDoc - The Mongoose document or plain object being deleted
 * @param {Object} [params.relatedData] - Associated children (e.g. payments, ledgers)
 * @param {Object} [params.user] - req.user performing the deletion
 * @param {string} [params.reason] - Optional reason or note
 */
async function archiveDeletedRecord({ modelName, originalDoc, relatedData = {}, user = null, reason = '' }) {
  if (!originalDoc) return null;

  try {
    const rawData = typeof originalDoc.toObject === 'function' ? originalDoc.toObject() : originalDoc;
    const originalId = rawData._id || originalDoc._id;
    const hostel = rawData.hostel || originalDoc.hostel || (user ? user.assignedHostel : null);

    const archiveDoc = await DeletedArchive.create({
      modelName,
      originalId,
      hostel,
      data: rawData,
      relatedData,
      deletedBy: user ? user._id : null,
      deletedByName: user ? (user.name || user.username || '') : 'System',
      deletedByEmail: user ? (user.email || '') : '',
      reason,
      deletedAt: new Date()
    });

    console.log(`[DeletedArchive] 🛡️ Safely archived deleted ${modelName} (${originalId}) for hostel ${hostel || 'unknown'}`);
    return archiveDoc;
  } catch (err) {
    console.error(`[DeletedArchive] ⚠️ Failed to archive deleted ${modelName}:`, err.message);
    return null;
  }
}

module.exports = {
  archiveDeletedRecord
};
