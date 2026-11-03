const Guest = require('../models/Guest');
const GuestLedger = require('../models/GuestLedger');

/**
 * Handles ledger impact when a payment is made via 'Wallet' or billed to 'Khata'.
 * If multiple guests stay together, all billing/credit is charged strictly to the primary guest.
 */
async function recordLedgerImpact({ guestId, hostelId, stayId, amount, paymentMethod, description, userId }) {
  if (paymentMethod !== 'Wallet' && paymentMethod !== 'Khata') {
    return null;
  }

  const amt = Number(amount) || 0;
  if (amt <= 0) return null;

  try {
    const guestDoc = await Guest.findById(guestId);
    if (!guestDoc) return null;

    const prevBal = Number(guestDoc.ledgerBalance) || 0;
    // Wallet deduction or Khata charge reduces the balance (decreases advance or increases due)
    const newBal = Math.round((prevBal - amt) * 100) / 100;
    guestDoc.ledgerBalance = newBal;
    await guestDoc.save();

    const entryType = paymentMethod === 'Wallet' ? 'WALLET_DEDUCTION' : 'STAY_CHARGE';
    const defaultDesc = paymentMethod === 'Wallet' 
      ? 'Room stay paid from advance wallet' 
      : 'Room stay billed to Khata / Udhaar';

    const entry = await GuestLedger.create({
      guest: guestDoc._id,
      hostel: hostelId,
      stay: stayId,
      entryType,
      amount: amt,
      balanceAfter: newBal,
      paymentMethod,
      description: description || defaultDesc,
      createdBy: userId
    });

    return entry;
  } catch (err) {
    console.error('Error recording ledger impact:', err);
    return null;
  }
}

module.exports = {
  recordLedgerImpact
};

