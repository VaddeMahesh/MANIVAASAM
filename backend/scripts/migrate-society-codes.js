/**
 * One-time migration for Society Codes + flat uniqueness.
 *
 *   node scripts/migrate-society-codes.js           # dry run: report only, writes nothing
 *   node scripts/migrate-society-codes.js --apply   # write changes
 *
 * What it does:
 *   1. Gives every apartment without a societyCode a new unique code (e.g. "SRI4821").
 *   2. Fills flat.flatKey ("A-101" -> "A101") for every flat.
 *   3. Reports conflicts that would break the new unique rules:
 *        - two flats in the same apartment with the same flatKey ("A101" vs "A-101")
 *        - two residents with the same email
 *   4. Builds the unique indexes, but only when there are no conflicts for that index.
 *
 * Uses MONGODB_URI from backend/.env (same as the server).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Apartment = require('../src/models/Apartment');
const Flat = require('../src/models/Flat');
const Resident = require('../src/models/Resident');
const { toFlatKey } = require('../src/utils/flatKey');

const APPLY = process.argv.includes('--apply');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/apartment-management';
  await mongoose.connect(uri, { autoIndex: false });
  console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN (no changes will be written)'} on ${uri.replace(/\/\/[^@]+@/, '//****@')}\n`);

  let problems = 0;

  // 1. Society codes ---------------------------------------------------------
  console.log('1) Society codes');
  const apartments = await Apartment.find().select('_id apartmentName societyCode').lean();
  const reserved = new Set(apartments.map((a) => a.societyCode).filter(Boolean));
  for (const apt of apartments) {
    if (apt.societyCode) {
      console.log(`   = ${apt.apartmentName.padEnd(24)} ${apt.societyCode} (already set)`);
      continue;
    }
    let code;
    do { code = await Apartment.generateSocietyCode(apt.apartmentName); } while (reserved.has(code));
    reserved.add(code);
    console.log(`   + ${apt.apartmentName.padEnd(24)} ${code}`);
    // updateOne (not save) so old documents with missing optional fields don't fail validation
    if (APPLY) await Apartment.updateOne({ _id: apt._id }, { $set: { societyCode: code } });
  }

  // 2. Flat keys ---------------------------------------------------------------
  console.log('\n2) Flat keys');
  const flats = await Flat.find().select('_id apartmentId flatNumber flatKey').lean();
  const seen = new Map();
  const flatDupes = [];
  let toFill = 0;
  for (const f of flats) {
    const key = toFlatKey(f.flatNumber);
    const slot = `${f.apartmentId}:${key}`;
    if (seen.has(slot)) flatDupes.push([seen.get(slot), f]);
    else seen.set(slot, f);
    if (f.flatKey !== key) {
      toFill++;
      if (APPLY) await Flat.collection.updateOne({ _id: f._id }, { $set: { flatKey: key } });
    }
  }
  console.log(`   ${toFill} of ${flats.length} flats ${APPLY ? 'updated' : 'need'} a flatKey`);
  if (flatDupes.length) {
    problems += flatDupes.length;
    console.log('   ! Same flat saved twice in one apartment (merge or rename one, then re-run):');
    for (const [a, b] of flatDupes) {
      console.log(`     apartment ${a.apartmentId}: "${a.flatNumber}" (${a._id})  vs  "${b.flatNumber}" (${b._id})`);
    }
  }

  // 3. Resident emails -----------------------------------------------------------
  console.log('\n3) Resident emails');
  const emailDupes = await Resident.aggregate([
    { $group: { _id: { $toLower: '$email' }, n: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { n: { $gt: 1 } } },
  ]);
  if (emailDupes.length) {
    problems += emailDupes.length;
    console.log('   ! Duplicate resident emails (keep one account each, then re-run):');
    for (const d of emailDupes) console.log(`     ${d._id}: ${d.ids.join(', ')}`);
  } else {
    console.log('   no duplicates');
  }

  // 4. Indexes ---------------------------------------------------------------------
  console.log('\n4) Unique indexes');
  const ensure = async (label, ok, fn) => {
    if (!ok) return console.log(`   - ${label}: skipped (fix the conflicts above first)`);
    if (!APPLY) return console.log(`   - ${label}: will be created`);
    await fn();
    console.log(`   ✓ ${label}`);
  };

  await ensure('apartments.societyCode', true, () => Apartment.createIndexes());
  await ensure('flats (apartmentId, flatKey)', flatDupes.length === 0, () => Flat.createIndexes());
  await ensure('residents.email', emailDupes.length === 0, async () => {
    // The old non-unique email_1 index has the same key; it must be dropped before the unique one is built
    const existing = await Resident.collection.indexes();
    const old = existing.find((i) => i.name === 'email_1' && !i.unique);
    if (old) await Resident.collection.dropIndex('email_1');
    await Resident.createIndexes();
  });

  console.log(problems
    ? `\nDone with ${problems} conflict(s) to resolve.`
    : `\nDone. ${APPLY ? 'All changes applied.' : 'Re-run with --apply to write these changes.'}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('\nMigration failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
