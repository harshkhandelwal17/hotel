/**
 * Media Sync Script: Local uploads to Cloudflare R2
 * 
 * Purpose:
 * Scans all existing local Aadhaar / ID images in `backend/uploads/`
 * and uploads any missing files to Cloudflare R2 so no historic media is lost.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

dotenv.config({ path: path.join(__dirname, '../.env') });

const UPLOADS_DIR = path.join(__dirname, '../uploads');

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
  console.error('\n❌ ERROR: Cloudflare R2 credentials missing in backend/.env!');
  console.error('Please configure:');
  console.error('  R2_ACCOUNT_ID=');
  console.error('  R2_ACCESS_KEY_ID=');
  console.error('  R2_SECRET_ACCESS_KEY=');
  console.error('  R2_BUCKET_NAME=');
  console.error('  R2_PUBLIC_DOMAIN= (optional)\n');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  return 'image/jpeg';
}

async function fileExistsInR2(key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key
    }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // Network or other error, assume not checked
    return false;
  }
}

async function syncLocalMedia() {
  console.log('========================================================');
  console.log(' ☁️  SYNCING LOCAL MEDIA TO CLOUDFLARE R2');
  console.log('========================================================');

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`No uploads folder found at ${UPLOADS_DIR}`);
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter(f => !f.startsWith('.'));
  console.log(`Found ${files.length} files in local uploads folder.`);

  let uploadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(UPLOADS_DIR, filename);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) continue;

    const r2Key = `hotel_pms_uploads/${filename}`;

    try {
      const alreadyExists = await fileExistsInR2(r2Key);
      if (alreadyExists) {
        skippedCount++;
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = getMimeType(filename);

      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: mimeType
      }));

      uploadedCount++;
      if (uploadedCount % 10 === 0 || uploadedCount === 1) {
        console.log(`[Progress] Uploaded ${uploadedCount}/${files.length}: ${filename}`);
      }
    } catch (err) {
      console.error(`❌ Failed to sync ${filename}:`, err.message);
      failedCount++;
    }
  }

  console.log('\n========================================================');
  console.log(' 🎉 SYNC COMPLETED!');
  console.log(`    ✅ Uploaded to Cloud: ${uploadedCount}`);
  console.log(`    ⏭️  Already in Cloud:  ${skippedCount}`);
  console.log(`    ❌ Failed:            ${failedCount}`);
  console.log('========================================================\n');
}

syncLocalMedia()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal sync error:', err);
    process.exit(1);
  });
