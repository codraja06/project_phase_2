import mongoose from 'mongoose';
import { AuditEvent } from '../models/AuditEvent';

/** Source event and business update commit together; relay retries are idempotent. */
export async function relayAuditEvents(limit = 50) {
  for (const name of ['Complaint', 'User', 'DepartmentRule']) {
    const model = mongoose.models[name];
    if (!model) continue;
    const sources = await model.find({ 'auditPending.0': { $exists: true } }).select('auditPending').limit(limit).lean();
    for (const source of sources as any[]) for (const entry of source.auditPending || []) {
      await AuditEvent.updateOne({ _id: entry._id }, { $setOnInsert: entry }, { upsert: true });
      await model.updateOne({ _id: source._id }, { $pull: { auditPending: { _id: entry._id } } });
    }
  }
}
export function startAuditRelay() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return; running = true;
    try { await relayAuditEvents(); } catch { console.error('Audit relay pending; persisted source events will retry.'); }
    finally { running = false; }
  }, 5000);
  timer.unref(); return timer;
}
