// Configuration presence and aggregate database metadata only. Never prints secret values or records.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const dotenv = require('../backend/node_modules/dotenv');
const mongoose = require('../backend/node_modules/mongoose');
const destination = path.join(root, 'docs/audit-2026-10-25');
fs.mkdirSync(destination, { recursive: true });
const raw = fs.readFileSync(path.join(root, 'backend/.env'), 'utf8');
const config = dotenv.parse(raw);
const keys = ['MONGODB_URI','JWT_SECRET','AI_SERVICE_URL','BACKEND_PUBLIC_URL','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','GOOGLE_CLIENT_ID','CHAT_PROVIDER_URL','CHAT_PROVIDER_API_KEY','CHAT_PROVIDER_MODEL','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','EMAIL_FROM','SMS_PROVIDER','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM','OTP_HASH_SECRET','RESOLUTION_TARGET_HOURS'];
const usable = value => Boolean(value?.trim()) && !/^(?:your[_-]|replace[_-]|change[_-]|<|\$\{)/i.test(value.trim());
const counts = {};
for (const line of raw.split(/\r?\n/)) {
  const key = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/)?.[1];
  if (key) counts[key] = (counts[key] || 0) + 1;
}
const snapshot = { capturedFor: '2026-10-25 Asia/Calcutta', configuration: Object.fromEntries(keys.map(key => [key, usable(config[key]) ? 'present (not authenticated)' : 'missing or placeholder'])), duplicateConfigurationKeys: Object.keys(counts).filter(key => counts[key] > 1) };
(async () => {
  try {
    await mongoose.connect(config.MONGODB_URI || 'mongodb://127.0.0.1:27017/civic_issue_db', { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    snapshot.database = { access: 'read-only aggregate inspection; no model initialization or writes', collections: {} };
    for (const name of ['users','complaints','departmentrules','notifications','notificationdeliveries','conversations','signupchallenges']) {
      const col = db.collection(name);
      snapshot.database.collections[name] = { records: await col.countDocuments({}), indexes: await col.listIndexes().toArray().then(items => items.map(({name,key,unique,expireAfterSeconds}) => ({name,key,unique:!!unique,...(expireAfterSeconds !== undefined ? {expireAfterSeconds} : {})}))).catch(() => []) };
    }
    const complaints = db.collection('complaints');
    snapshot.database.accountRoles = await db.collection('users').aggregate([
      { $group: { _id: { role: '$role', administrator: { $eq: ['$isAdmin', true] } }, count: { $sum: 1 } } },
    ]).toArray();
    snapshot.database.complaintQuality = {
      statusCounts: await complaints.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
      missingSeverity: await complaints.countDocuments({ severity: { $exists: false } }),
      missingCoordinates: await complaints.countDocuments({ $or: [{latitude:{$exists:false}}, {longitude:{$exists:false}}, {latitude:{$lt:-90}}, {latitude:{$gt:90}}, {longitude:{$lt:-180}}, {longitude:{$gt:180}}] }),
      resolvedWithoutTimestamp: await complaints.countDocuments({ status: 'Resolved', resolvedAt: null }),
    };
  } catch { snapshot.database = { access: 'unavailable', error: 'Could not inspect configured database; no records or connection details logged' }; }
  finally { await mongoose.disconnect(); }
  const file = path.join(destination, `${process.env.AUDIT_PHASE ? process.env.AUDIT_PHASE + '-' : ''}configuration-and-database.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify(snapshot, null, 2));
})().catch(() => { console.error('Audit snapshot failed without logging private details'); process.exitCode = 1; });
