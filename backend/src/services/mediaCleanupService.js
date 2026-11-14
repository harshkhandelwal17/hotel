const path = require('path');
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const WhatsAppMedia = require('../models/WhatsAppMedia');
const Guest = require('../models/Guest');
const { deleteMediaFile, extractStorageKey } = require('../utils/mediaStorage');

let s3Client = null;
if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
  });
}

/**
 * Perform comprehensive cleanup of unused WhatsApp media:
 * 1. Collects all image URLs currently linked to Guests (idProofImage / idProofImageBack).
 * 2. Deletes unused WhatsAppMedia records and their corresponding physical files (Cloudflare R2 / Disk).
 * 3. Scans Cloudflare R2 bucket for orphaned wa- files and purges them.
 *
 * @param {Object} options
 * @param {number} options.olderThanHours - delete unused items older than this (default 24h)
 * @param {boolean} options.forceAllUnused - if true, deletes ALL unused items regardless of age
 */
const cleanupUnusedMedia = async ({ olderThanHours = 24, forceAllUnused = false, hostelId = null } = {}) => {
  console.log(`[MediaCleanup] 🧹 Starting cleanup (olderThanHours: ${olderThanHours}, forceAll: ${forceAllUnused}, hostel: ${hostelId || 'all'})...`);

  let deletedDbCount = 0;
  let deletedR2Count = 0;
  let protectedCount = 0;

  try {
    // 1. Gather all protected URLs from Guests
    const guests = await Guest.find({
      $or: [
        { idProofImage: { $exists: true, $ne: '' } },
        { idProofImageBack: { $exists: true, $ne: '' } }
      ]
    }).select('idProofImage idProofImageBack');

    const protectedKeys = new Set();
    const protectedUrls = new Set();

    guests.forEach(g => {
      if (g.idProofImage) {
        protectedUrls.add(g.idProofImage);
        const k = extractStorageKey(g.idProofImage);
        if (k) protectedKeys.add(k);
      }
      if (g.idProofImageBack) {
        protectedUrls.add(g.idProofImageBack);
        const k = extractStorageKey(g.idProofImageBack);
        if (k) protectedKeys.add(k);
      }
    });

    // 2. Also protect any WhatsAppMedia explicitly marked as used
    const usedMedia = await WhatsAppMedia.find({ status: 'used' }).select('imageUrl');
    usedMedia.forEach(m => {
      if (m.imageUrl) {
        protectedUrls.add(m.imageUrl);
        const k = extractStorageKey(m.imageUrl);
        if (k) protectedKeys.add(k);
      }
    });

    // 3. Find target unused WhatsAppMedia records to delete
    const query = { status: 'new' };
    if (hostelId) {
      query.hostel = hostelId;
    }
    if (!forceAllUnused) {
      const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      query.createdAt = { $lt: cutoff };
    }

    const unselectedMedia = await WhatsAppMedia.find(query);

    for (const media of unselectedMedia) {
      const key = extractStorageKey(media.imageUrl);

      // Verify that this file is not actually in protected list
      if (protectedUrls.has(media.imageUrl) || (key && protectedKeys.has(key))) {
        await WhatsAppMedia.updateOne({ _id: media._id }, { status: 'used' });
        protectedCount++;
        continue;
      }

      // Delete file from Cloudflare R2 / disk
      await deleteMediaFile(media.imageUrl);

      // Remove from MongoDB
      await WhatsAppMedia.deleteOne({ _id: media._id });
      deletedDbCount++;
    }

    // 4. Clean up any orphaned files in Cloudflare R2 older than 48 hours
    if (s3Client && process.env.R2_BUCKET_NAME) {
      let continuationToken = null;

      do {
        const listParams = {
          Bucket: process.env.R2_BUCKET_NAME,
          Prefix: 'hotel_pms_uploads/wa-'
        };
        if (continuationToken) {
          listParams.ContinuationToken = continuationToken;
        }

        const listCmd = new ListObjectsV2Command(listParams);

        const listRes = await s3Client.send(listCmd);
        if (listRes.Contents && listRes.Contents.length > 0) {
          for (const item of listRes.Contents) {
            const r2Key = item.Key;

            // If protected, skip
            if (protectedKeys.has(r2Key)) {
              continue;
            }

            // Check if there is an active new WhatsAppMedia within 24h grace period
            const activeRecent = await WhatsAppMedia.findOne({
              imageUrl: { $regex: r2Key },
              createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });
            if (activeRecent) {
              continue;
            }

            // If file was modified less than 24h ago, protect it!
            if (item.LastModified && (Date.now() - new Date(item.LastModified).getTime()) < 24 * 60 * 60 * 1000) {
              continue;
            }

            // Not protected and older than 24h -> Safe to delete from R2
            try {
              await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key
              }));
              deletedR2Count++;
            } catch (delErr) {
              console.warn(`[MediaCleanup] Failed to delete R2 key ${r2Key}:`, delErr.message);
            }
          }
        }

        continuationToken = listRes.NextContinuationToken;
      } while (continuationToken);
    }

    console.log(`[MediaCleanup] ✅ Safe cleanup finished: Deleted DB: ${deletedDbCount}, Deleted R2/Disk: ${deletedR2Count}, Protected: ${protectedCount}`);
    return {
      success: true,
      deletedDbCount,
      deletedR2Count,
      protectedCount
    };
  } catch (err) {
    console.error('[MediaCleanup] ❌ Error during cleanup:', err);
    throw err;
  }
};

/**
 * Rolling FIFO Buffer:
 * Automatically ensures that the number of unused WhatsApp images for a hotel
 * never exceeds maxBuffer (default 50).
 * When new images arrive, the oldest unused images from the bottom are automatically
 * purged from MongoDB and physical storage (R2 / local uploads).
 * Used / checked-in guest photos are 100% protected.
 */
const maintainHostelMediaBuffer = async (hostelId, maxBuffer = 50) => {
  if (!hostelId) return { purgedCount: 0 };

  try {
    // 1. Fetch all unused media for this hostel, sorted newest first (descending)
    const unusedMedia = await WhatsAppMedia.find({
      hostel: hostelId,
      status: 'new'
    })
      .sort({ createdAt: -1 })
      .select('_id imageUrl');

    // If unused count is within limit, nothing to purge
    if (unusedMedia.length <= maxBuffer) {
      return { purgedCount: 0 };
    }

    // 2. Identify the overflow items at the bottom (oldest ones beyond maxBuffer)
    const excessItems = unusedMedia.slice(maxBuffer);

    // 3. Collect all protected image URLs from checked-in guests
    const guests = await Guest.find({
      $or: [
        { idProofImage: { $exists: true, $ne: '' } },
        { idProofImageBack: { $exists: true, $ne: '' } }
      ]
    }).select('idProofImage idProofImageBack').lean();

    const protectedUrls = new Set();
    const protectedKeys = new Set();
    guests.forEach(g => {
      if (g.idProofImage) {
        protectedUrls.add(g.idProofImage);
        const k = extractStorageKey(g.idProofImage);
        if (k) protectedKeys.add(k);
      }
      if (g.idProofImageBack) {
        protectedUrls.add(g.idProofImageBack);
        const k = extractStorageKey(g.idProofImageBack);
        if (k) protectedKeys.add(k);
      }
    });

    let purgedCount = 0;
    for (const item of excessItems) {
      const key = extractStorageKey(item.imageUrl);
      if (protectedUrls.has(item.imageUrl) || (key && protectedKeys.has(key))) {
        // Protect it by marking status used
        await WhatsAppMedia.updateOne({ _id: item._id }, { status: 'used' }).catch(() => {});
      } else {
        // Delete physical file (Cloudflare R2 and/or local uploads)
        await deleteMediaFile(item.imageUrl).catch(() => {});
        // Remove from database
        await WhatsAppMedia.deleteOne({ _id: item._id }).catch(() => {});
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      console.log(`[WhatsApp Rolling Buffer] 🔄 Auto-purged ${purgedCount} oldest unused photos for Hostel ${hostelId}. (Maintained top ${maxBuffer} newest photos).`);
    }

    return { purgedCount };
  } catch (err) {
    console.warn(`[WhatsApp Rolling Buffer] ⚠️ Warning while maintaining buffer for Hostel ${hostelId}:`, err.message);
    return { purgedCount: 0 };
  }
};

/**
 * Scheduled cleanup (Safe 7-day retention, no boot deletion)
 */
let intervalHandle = null;
const startScheduledCleanup = () => {
  if (intervalHandle) return;

  // Repeat once every 24 hours (Safe 7-day retention, NEVER on boot)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  intervalHandle = setInterval(() => {
    cleanupUnusedMedia({ olderThanHours: 24 * 7, forceAllUnused: false }).catch(err => {
      console.warn('[MediaCleanup] Periodic cleanup notice:', err.message);
    });
  }, TWENTY_FOUR_HOURS);
};

module.exports = {
  cleanupUnusedMedia,
  maintainHostelMediaBuffer,
  startScheduledCleanup
};
