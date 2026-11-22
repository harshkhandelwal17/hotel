/**
 * Instant Single-Item Recovery Script: Restore Deleted Stay & Payments
 * 
 * Usage:
 *   node backend/scripts/restore-deleted-stay.js [stayId]
 * 
 * If stayId is not passed, it shows the last 10 deleted stays with room number, guest name,
 * and deletion time so you can choose which one to restore in 1 click!
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is missing in backend/.env');
  process.exit(1);
}

const DeletedArchive = require('../src/models/DeletedArchive');
const Stay = require('../src/models/Stay');
const Payment = require('../src/models/Payment');
const GuestLedger = require('../src/models/GuestLedger');
const LaundryOrder = require('../src/models/LaundryOrder');
const Guest = require('../src/models/Guest');
const Room = require('../src/models/Room');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (q) => new Promise(res => rl.question(q, res));

async function restoreStay(archiveRecord) {
  console.log(`\n⏳ Restoring Stay ${archiveRecord.originalId}...`);

  const stayData = archiveRecord.data;
  const related = archiveRecord.relatedData || {};

  // Check if stay already exists in live database
  const exists = await Stay.findById(stayData._id);
  if (exists) {
    console.log(`⚠️ Stay ${stayData._id} already exists in live database. Skipping duplicate create.`);
  } else {
    await Stay.create(stayData);
    console.log(`✅ Stay document restored.`);
  }

  // Restore Payments
  if (related.payments && related.payments.length > 0) {
    for (const p of related.payments) {
      const pExists = await Payment.findById(p._id);
      if (!pExists) {
        await Payment.create(p);
      }
    }
    console.log(`✅ Restored ${related.payments.length} associated payments.`);
  }

  // Restore GuestLedger entries
  if (related.ledgerEntries && related.ledgerEntries.length > 0) {
    for (const l of related.ledgerEntries) {
      const lExists = await GuestLedger.findById(l._id);
      if (!lExists) {
        await GuestLedger.create(l);
      }
    }
    console.log(`✅ Restored ${related.ledgerEntries.length} associated ledger entries.`);
  }

  // Restore Laundry Orders
  if (related.laundryOrders && related.laundryOrders.length > 0) {
    for (const lo of related.laundryOrders) {
      const loExists = await LaundryOrder.findById(lo._id);
      if (!loExists) {
        await LaundryOrder.create(lo);
      }
    }
    console.log(`✅ Restored ${related.laundryOrders.length} laundry orders.`);
  }

  // Remove from archive now that it is restored
  await DeletedArchive.deleteOne({ _id: archiveRecord._id });

  console.log(`\n🎉 SUCCESS: Stay and all related transactions have been fully restored to live database!`);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const targetStayId = process.argv[2];

  if (targetStayId) {
    const archive = await DeletedArchive.findOne({
      modelName: 'Stay',
      originalId: targetStayId
    });

    if (!archive) {
      console.error(`❌ No archived deleted record found for Stay ID: ${targetStayId}`);
      process.exit(1);
    }

    await restoreStay(archive);
    process.exit(0);
  }

  // List recent deleted stays
  const deletedStays = await DeletedArchive.find({ modelName: 'Stay' })
    .sort({ deletedAt: -1 })
    .limit(10);

  if (deletedStays.length === 0) {
    console.log('ℹ️ No recently deleted stays found in the archive recycle bin.');
    process.exit(0);
  }

  console.log('========================================================');
  console.log(' 🗑️ RECENTLY DELETED STAYS (RECYCLE BIN)');
  console.log('========================================================');

  for (let i = 0; i < deletedStays.length; i++) {
    const d = deletedStays[i];
    const guestName = d.data.guestName || d.data.guest?.fullName || 'Unknown Guest';
    const room = d.data.roomNumber || 'Room N/A';
    const deletedTime = new Date(d.deletedAt).toLocaleString('en-IN');
    const by = d.deletedByName || 'Staff';
    console.log(` [${i + 1}] ID: ${d.originalId} | Room: ${room} | Guest: ${guestName} | Deleted: ${deletedTime} (by ${by})`);
  }

  console.log('========================================================');
  const answer = await askQuestion('\nEnter the number [1-' + deletedStays.length + '] to restore (or "q" to quit): ');
  const choice = parseInt(answer.trim(), 10);

  if (choice >= 1 && choice <= deletedStays.length) {
    await restoreStay(deletedStays[choice - 1]);
  } else {
    console.log('Operation cancelled.');
  }

  rl.close();
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
