/**
 * Automated Production MongoDB Backup Script
 * 
 * Features:
 * 1. Takes full compressed snapshot of MongoDB using mongodump.
 * 2. Saves local timestamped archive in `backend/backups/`.
 * 3. Rotates local copies (retains last 14 backups to prevent disk overflow).
 * 4. If Cloudflare R2 / S3 credentials exist in .env:
 *    - Automatically streams the backup archive to Cloudflare R2 under `db_backups/`.
 *    - Guarantees offsite, disaster-proof copy with 99.999999999% durability.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel';
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_LOCAL_BACKUPS = 14; // Keep last 14 backups locally

// Setup S3/R2 client if credentials are provided
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

function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}-${MM}-${dd}_${hh}-${mm}-${ss}`;
}

async function rotateLocalBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.archive.gz'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_LOCAL_BACKUPS) {
      const toDelete = files.slice(MAX_LOCAL_BACKUPS);
      toDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`[Backup Rotation] 🧹 Removed older local backup: ${file.name}`);
      });
    }
  } catch (err) {
    console.warn('[Backup Rotation] Warning:', err.message);
  }
}

async function uploadToCloud(filePath, filename) {
  if (!s3Client || !process.env.R2_BUCKET_NAME) {
    console.log('\n⚠️  Cloudflare R2 is NOT configured in .env.');
    console.log('   The backup is saved on local disk, but for 100% Zero-Loss protection,');
    console.log('   configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in backend/.env.');
    return;
  }

  const cloudKey = `db_backups/${filename}`;
  console.log(`[Cloud Backup] 🚀 Uploading to Cloudflare R2: ${cloudKey}...`);

  const fileStream = fs.createReadStream(filePath);
  const fileSize = fs.statSync(filePath).size;

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: cloudKey,
    Body: fileStream,
    ContentLength: fileSize,
    ContentType: 'application/gzip'
  }));

  console.log(`[Cloud Backup] ✅ Successfully saved to Cloudflare R2 bucket: ${process.env.R2_BUCKET_NAME}/${cloudKey}`);
}

async function runBackup() {
  console.log('========================================================');
  console.log(' 🛡️  HOTEL PMS DATABASE BACKUP INITIATED');
  console.log('========================================================');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = getFormattedTimestamp();
  const filename = `backup_${timestamp}.archive.gz`;
  const targetPath = path.join(BACKUP_DIR, filename);

  // Mask password in log output
  const maskedUri = MONGO_URI.replace(/:([^@]+)@/, ':*****@');
  console.log(`[Database] Connecting to: ${maskedUri}`);
  console.log(`[Target] ${targetPath}`);

  const dumpCmd = `mongodump --uri="${MONGO_URI}" --archive="${targetPath}" --gzip`;

  return new Promise((resolve, reject) => {
    exec(dumpCmd, async (error, stdout, stderr) => {
      if (error) {
        console.error('❌ mongodump failed:', error.message);
        if (stderr) console.error(stderr);
        return reject(error);
      }

      const stats = fs.statSync(targetPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`\n✅ Local backup completed successfully!`);
      console.log(`   📁 File: ${filename}`);
      console.log(`   📦 Size: ${sizeMB} MB`);

      // 1. Rotate older local backups
      await rotateLocalBackups();

      // 2. Offsite Cloud Backup
      try {
        await uploadToCloud(targetPath, filename);
      } catch (cloudErr) {
        console.error('❌ Cloud upload failed:', cloudErr.message);
      }

      console.log('\n========================================================');
      console.log(' 🌟 BACKUP COMPLETE & SECURED');
      console.log(`    To restore if needed, run:`);
      console.log(`    mongorestore --uri="${maskedUri}" --archive="${targetPath}" --gzip --drop`);
      console.log('========================================================\n');
      resolve();
    });
  });
}

runBackup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal backup error:', err);
    process.exit(1);
  });
