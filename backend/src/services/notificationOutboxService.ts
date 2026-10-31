import { Complaint, IComplaint } from '../models/Complaint';
import { NotificationIntent } from '../models/NotificationIntent';
import { User } from '../models/User';
import { notifyUser } from './notificationService';

export function notificationIntent(eventKey: string, title: string, message: string,
  audience: 'owner' | 'authorities' = 'owner'): NotificationIntent {
  return { eventKey, title, message, audience, at: new Date(), deliveredAt: null };
}

export function appendNotificationIntent(complaint: IComplaint, ...intents: NotificationIntent[]) {
  if (!complaint.isNew && !complaint.isSelected('notificationOutbox')) throw new Error('Select the existing outbox before appending');
  complaint.notificationOutbox = [...(complaint.notificationOutbox || []), ...intents];
  complaint.notificationOutboxPending = true;
}

export async function flushComplaintNotifications(complaintId: unknown) {
  const complaint = await Complaint.findById(complaintId).select('+notificationOutbox +notificationOutboxPending');
  if (!complaint) return;
  for (const intent of complaint.notificationOutbox || []) {
    if (intent.deliveredAt) continue;
    const recipients = intent.audience === 'authorities'
      ? await User.find({ role: 'authority', $or: [{ isAdmin: true }, ...(complaint.assignedDepartment ? [{ department: complaint.assignedDepartment }] : [])] }).select('_id').lean()
      : [{ _id: complaint.createdBy }];
    for (const recipient of recipients) await notifyUser(recipient._id, {
      complaintId: complaint._id, eventKey: intent.eventKey, title: intent.title, message: intent.message,
    });
    // Unique notification keys make concurrent workers/retries safe; readAt is never reset.
    await Complaint.updateOne({ _id: complaint._id }, { $set: { 'notificationOutbox.$[intent].deliveredAt': new Date() } },
      { arrayFilters: [{ 'intent.eventKey': intent.eventKey, 'intent.deliveredAt': null }] });
  }
  // The predicate prevents clearing a concurrently appended intent's pending flag.
  await Complaint.updateOne({ _id: complaint._id, notificationOutbox: { $not: { $elemMatch: { deliveredAt: null } } } },
    { $set: { notificationOutboxPending: false } });
}

export async function attemptNotificationFlush(complaintId: unknown) {
  try { await flushComplaintNotifications(complaintId); }
  catch { console.error('Complaint update saved; durable notification intent awaits retry.'); }
}

export async function runNotificationOutboxPass(limit = 20) {
  const pending = await Complaint.find({ notificationOutboxPending: true }).select('_id').limit(limit).lean();
  for (const complaint of pending) await attemptNotificationFlush(complaint._id);
}
