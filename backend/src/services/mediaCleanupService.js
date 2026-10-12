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
const cleanupUnusedMedia = async ({ olderThanHours = 24, forceAllUnused = false } = {}) => {
  console.log(`[MediaCleanup] 🧹 Starting cleanup (olderThanHours: ${olderThanHours}, forceAll: ${forceAllUnused})...`);

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
    if (!forceAllUnused) {
      const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      query.createdAt = { $lt: cutoff };
    }

    const unselectedMedia = await WhatsAppMedia.find(query);

    for (const media of unselectedMedia) {
      const key = extractStorageKey(media.imageUrl);

      // Verify that this file is not actually in protected list
      if (protectedUrls.has(media.imageUrl) || (key && protectedKeys.has(key))) {
        // Safe check: If it was somehow used by a guest, mark as used instead of deleting!
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

    // 4. Clean up any orphaned files in Cloudflare R2 (prefix: hotel_pms_uploads/wa-)
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

            // Check if there is an active new WhatsAppMedia within grace period
            if (!forceAllUnused) {
              const activeRecent = await WhatsAppMedia.findOne({
                imageUrl: { $regex: r2Key },
                createdAt: { $gte: new Date(Date.now() - olderThanHours * 60 * 60 * 1000) }
              });
              if (activeRecent) {
                continue;
              }
            }

            // Not protected and not active -> Delete from R2
            try {
              await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: r2Key
              }));
              deletedR2Count++;
              console.log(`[MediaCleanup] 🗑️ Removed orphaned R2 object: ${r2Key}`);
            } catch (delErr) {
              console.warn(`[MediaCleanup] Failed to delete R2 key ${r2Key}:`, delErr.message);
            }
          }
        }

        continuationToken = listRes.NextContinuationToken;
      } while (continuationToken);
    }

    console.log(`[MediaCleanup] ✅ Cleanup finished: Deleted DB: ${deletedDbCount}, Deleted R2/Disk: ${deletedR2Count}, Protected: ${protectedCount}`);
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
 * Start periodic automated cleanup (runs every 6 hours)
 */
let intervalHandle = null;
const startScheduledCleanup = () => {
  if (intervalHandle) return;

  // Run initial pass 10 seconds after boot
  setTimeout(() => {
    cleanupUnusedMedia({ olderThanHours: 24, forceAllUnused: false }).catch(err => {
      console.warn('[MediaCleanup] Initial scheduled cleanup failed:', err.message);
    });
  }, 10000);

  // Repeat every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  intervalHandle = setInterval(() => {
    cleanupUnusedMedia({ olderThanHours: 24, forceAllUnused: false }).catch(err => {
      console.warn('[MediaCleanup] Periodic scheduled cleanup failed:', err.message);
    });
  }, SIX_HOURS);

  console.log('[MediaCleanup] ⏰ Automated WhatsApp media cleanup scheduled (every 6h, 24h retention for unused).');
};

module.exports = {
  cleanupUnusedMedia,
  startScheduledCleanup
};
