/**
 * Interactive & Automated MongoDB Restore Script
 * 
 * Capabilities:
 * 1. Discovers backups from local disk AND Cloudflare R2 (db_backups/ folder).
 * 2. Downloads selected backup archive safely.
 * 3. Restores to MongoDB Atlas using mongorestore with --gzip and --drop.
 * 4. Supports --target-db=<dbname> so you can restore to a separate sandbox/audit DB
 *    without touching the live production database!
 * 
 * Usage:
 *   node backend/scripts/restore-db.js               # Interactive mode (prompts to choose)
 *   node backend/scripts/restore-db.js --latest      # Automatically restores most recent backup
 *   node backend/scripts/restore-db.js --target-db=hotel_recovery  # Restores into a side DB
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const readline = require('readline');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { pipeline } = require('stream/promises');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel';
const BACKUP_DIR = path.join(__dirname, '../backups');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (q) => new Promise(res => rl.question(q, res));

async function getAvailableBackups() {
  const backups = [];

  // 1. Scan local backups
  if (fs.existsSync(BACKUP_DIR)) {
    const localFiles = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup_') && f.endsWith('.archive.gz'));
    for (const f of localFiles) {
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      backups.push({
        source: 'LOCAL',
        name: f,
        localPath: fullPath,
        sizeBytes: stat.size,
        date: stat.mtime
      });
    }
  }

  // 2. Scan Cloudflare R2 backups
  if (s3Client && process.env.R2_BUCKET_NAME) {
    try {
      const res = await s3Client.send(new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: 'db_backups/'
      }));

      if (res.Contents && res.Contents.length > 0) {
        for (const item of res.Contents) {
          if (!item.Key.endsWith('.archive.gz')) continue;
          const filename = path.basename(item.Key);
          // If already found locally, mark as available locally too
          const existing = backups.find(b => b.name === filename);
          if (!existing) {
            backups.push({
              source: 'CLOUDFLARE_R2',
              name: filename,
              r2Key: item.Key,
              sizeBytes: item.Size || 0,
              date: item.LastModified || new Date()
            });
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch backups from Cloudflare R2:', err.message);
    }
  }

  backups.sort((a, b) => new Date(b.date) - new Date(a.date));
  return backups;
}

async function downloadFromR2(backupItem) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const targetPath = path.join(BACKUP_DIR, backupItem.name);
  if (fs.existsSync(targetPath)) {
    return targetPath;
  }

  console.log(`\n⬇️  Downloading ${backupItem.name} from Cloudflare R2...`);
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: backupItem.r2Key
  }));

  const fileStream = fs.createWriteStream(targetPath);
  await pipeline(response.Body, fileStream);
  console.log(`✅ Download complete: ${targetPath}`);
  return targetPath;
}

async function runRestore() {
  const args = process.argv.slice(2);
  const isLatest = args.includes('--latest');
  const targetDbArg = args.find(a => a.startsWith('--target-db='));
  const targetDb = targetDbArg ? targetDbArg.split('=')[1] : null;

  console.log('========================================================');
  console.log(' 🔄 HOTEL PMS DATABASE RESTORE ASSISTANT');
  console.log('========================================================');

  const backups = await getAvailableBackups();

  if (backups.length === 0) {
    console.error('❌ No backups found locally or in Cloudflare R2.');
    rl.close();
    process.exit(1);
  }

  let selectedBackup = null;

  if (isLatest) {
    selectedBackup = backups[0];
    console.log(`Automatically selected latest backup: ${selectedBackup.name}`);
  } else {
    console.log('\nAvailable Backups:');
    backups.forEach((b, idx) => {
      const sizeMB = (b.sizeBytes / (1024 * 1024)).toFixed(2);
      const timeStr = new Date(b.date).toLocaleString('en-IN');
      console.log(` [${idx + 1}] ${b.name} (${sizeMB} MB) | ${timeStr} [${b.source}]`);
    });

    const answer = await askQuestion(`\nEnter backup number to restore [1-${backups.length}] (or "q" to cancel): `);
    const choice = parseInt(answer.trim(), 10);

    if (choice >= 1 && choice <= backups.length) {
      selectedBackup = backups[choice - 1];
    } else {
      console.log('Operation cancelled.');
      rl.close();
      process.exit(0);
    }
  }

  // Confirm before restoring
  const maskedUri = MONGO_URI.replace(/:([^@]+)@/, ':*****@');
  console.log(`\n⚠️  WARNING: Restoring will overwrite existing data!`);
  console.log(`   Target DB URI: ${maskedUri}`);
  if (targetDb) {
    console.log(`   Restoring specifically into database: ${targetDb}`);
  }
  console.log(`   Backup Archive: ${selectedBackup.name}`);

  const confirm = await askQuestion('\nType "RESTORE" to proceed with data recovery: ');
  if (confirm.trim() !== 'RESTORE') {
    console.log('Confirmation failed. Restore cancelled.');
    rl.close();
    process.exit(0);
  }
  rl.close();

  // Get archive local path
  let archivePath = selectedBackup.localPath;
  if (!archivePath || !fs.existsSync(archivePath)) {
    archivePath = await downloadFromR2(selectedBackup);
  }

  let restoreCmd = `mongorestore --uri="${MONGO_URI}" --archive="${archivePath}" --gzip --drop`;
  if (targetDb) {
    restoreCmd += ` --nsInclude="*.*" --nsFrom="*.*" --nsTo="${targetDb}.*"`;
  }

  console.log(`\n⏳ Restoring database now...`);
  return new Promise((resolve, reject) => {
    exec(restoreCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ mongorestore failed:', error.message);
        if (stderr) console.error(stderr);
        return reject(error);
      }

      console.log('\n========================================================');
      console.log(' 🎉 RESTORE COMPLETED SUCCESSFULLY!');
      console.log('    All data, stays, guests, and collections have been restored.');
      console.log('========================================================\n');
      resolve();
    });
  });
}

runRestore().catch(err => {
  console.error('Fatal restore error:', err.message);
  process.exit(1);
});
