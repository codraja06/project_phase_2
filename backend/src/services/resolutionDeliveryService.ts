import { randomUUID } from 'crypto';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { NotificationDelivery } from '../models/NotificationDelivery';
import { notifyUser } from './notificationService';
import { publishNotificationChange } from './liveNotifications';
import * as delivery from './contactDeliveryService';
import { runNotificationOutboxPass } from './notificationOutboxService';

function eligibility(user: any, channel: string): string | null {
  if (!user) return 'account_unavailable';
  if (channel === 'email') {
    if (!user.email || !user.emailVerifiedAt) return 'email_unverified';
    if (user.notificationPreferences?.email === false) return 'email_opted_out';
    if (!delivery.emailConfigured()) return 'provider_not_configured';
  } else {
    if (!user.phone || !user.phoneVerifiedAt) return 'phone_unverified';
    if (!user.notificationPreferences?.sms || !user.notificationPreferences.smsConsentedAt) return 'sms_consent_absent';
    if (!delivery.smsConfigured()) return 'provider_not_configured';
    if (!/^\+[1-9]\d{7,14}$/.test(user.phone)) return 'phone_requires_e164';
  }
  return null;
}

export async function queueResolutionNotifications(complaint: any) {
  if (complaint.status !== 'Resolved' || !complaint.resolutionNoticeAt) return;
  const at = new Date(complaint.resolutionNoticeAt);
  const eventKey = `${complaint._id}:resolved:${at.toISOString()}`;
  await notifyUser(complaint.createdBy, { complaintId: complaint._id, eventKey, title: 'Complaint Resolved',
    message: `Your complaint #${complaint.complaintId} has been resolved. Thank you for helping improve your community.`,
    resolution: { category: complaint.category, resolvedAt: at } });
  const notification = await Notification.findOne({ recipient: complaint.createdBy, eventKey });
  if (!notification) throw new Error('Resolution event persistence pending');
  const user = await User.findById(complaint.createdBy);
  for (const channel of ['email', 'sms']) {
    const reason = eligibility(user, channel);
    await NotificationDelivery.updateOne({ eventKey: `${eventKey}:${channel}` }, { $setOnInsert: {
      eventKey: `${eventKey}:${channel}`, recipient: complaint.createdBy, complaintId: complaint._id,
      notificationId: notification._id, channel, status: reason ? 'Skipped' : 'Pending', errorCode: reason,
      attempts: 0, nextAttemptAt: new Date(),
    } }, { upsert: true });
  }
  await Complaint.updateOne({ _id: complaint._id, resolutionNoticeAt: at }, { $set: { resolutionNoticePending: false } });
  await publishNotificationChange(String(complaint.createdBy));
}

export function resolutionEmail(user: any, complaint: any) {
  const category = String(complaint.category || 'other').replace(/_/g, ' ');
  const location = complaint.address?.trim() || (Number.isFinite(complaint.latitude) && Number.isFinite(complaint.longitude)
    ? `GPS ${complaint.latitude}, ${complaint.longitude}` : 'Location not recorded');
  const resolved = new Date(complaint.resolvedAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  const text = `Hello ${user.name},\n\nGood news! Your civic complaint has been marked as resolved by the municipal authority.\n\nComplaint ID: ${complaint.complaintId}\nIssue: ${category}\nLocation: ${location}\nResolved on: ${resolved}\n\nThank you for reporting this issue and helping make our community cleaner and safer.\n\nRegards,\nCivicTrack AI Team`;
  const e = delivery.escapeHtml;
  const html = `<div style="font-family:Arial,sans-serif;color:#17243a;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-top:4px solid #b71c1c"><h1 style="font-size:24px">Complaint resolved</h1><p>Hello ${e(user.name)},</p><p>Good news! Your civic complaint has been marked as resolved by the municipal authority.</p><table style="border-collapse:collapse;width:100%"><tr><th align="left">Complaint ID</th><td>${e(complaint.complaintId)}</td></tr><tr><th align="left">Issue</th><td>${e(category)}</td></tr><tr><th align="left">Location</th><td>${e(location)}</td></tr><tr><th align="left">Resolved on</th><td>${e(resolved)}</td></tr></table><p>Thank you for reporting this issue and helping make our community cleaner and safer.</p><p>Regards,<br>CivicTrack AI Team</p></div>`;
  return { text, html };
}

export async function runDeliveryWorkerPass(limit = 20) {
  await runNotificationOutboxPass(limit);
  // Resolution and this flag commit atomically in the complaint; a crash before enqueue is recoverable.
  const pending = await Complaint.find({ status: 'Resolved', resolutionNoticePending: true }).limit(limit);
  for (const complaint of pending) {
    try { await queueResolutionNotifications(complaint); }
    catch { console.error('Resolution notice persistence is pending; remaining jobs will continue.'); }
  }
  // A process might have died after provider acceptance. Never blindly send that message again.
  await NotificationDelivery.updateMany({ status: 'Processing', leaseUntil: { $lte: new Date() } }, {
    $set: { status: 'Failed', errorCode: 'delivery_outcome_unknown_manual_review' }, $unset: { claimedBy: 1, leaseUntil: 1 },
  });
  for (let i = 0; i < limit; i++) {
    const owner = randomUUID();
    const job = await NotificationDelivery.findOneAndUpdate({ status: { $in: ['Pending', 'Retry Scheduled'] }, nextAttemptAt: { $lte: new Date() } },
      { $set: { status: 'Processing', claimedBy: owner, leaseUntil: new Date(Date.now() + 120000) }, $inc: { attempts: 1 } }, { sort: { createdAt: 1 }, new: true });
    if (!job) break;
    const [user, complaint] = await Promise.all([User.findById(job.recipient), Complaint.findById(job.complaintId)]);
    let outcome: any;
    try {
      const reason = eligibility(user, job.channel!);
      if (reason || !complaint || complaint.status !== 'Resolved') outcome = { status: 'Skipped', errorCode: reason || 'complaint_unavailable' };
      else {
        let providerId: string;
        if (job.channel === 'email') {
          const message = resolutionEmail(user, complaint);
          providerId = await delivery.sendEmail(user!.email, 'Your CivicTrack complaint has been resolved', message.text, message.html, job.eventKey!);
        } else providerId = await delivery.sendSms(user!.phone!, `CivicTrack: Your complaint #${complaint.complaintId} has been resolved. Thank you for helping improve your community.`);
        outcome = { status: 'Sent', providerId, sentAt: new Date(), errorCode: null };
      }
    } catch (error) {
      const safe = error instanceof delivery.DeliveryError ? error : new delivery.DeliveryError('delivery_outcome_unknown', false, true);
      const retry = safe.retryable && job.attempts! < 5;
      outcome = { status: retry ? 'Retry Scheduled' : 'Failed', errorCode: safe.uncertain ? 'delivery_outcome_unknown_manual_review' : safe.code,
        ...(retry ? { nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** (job.attempts! - 1))) } : {}) };
    }
    await NotificationDelivery.updateOne({ _id: job._id, claimedBy: owner, status: 'Processing' }, { $set: outcome, $unset: { claimedBy: 1, leaseUntil: 1 } });
    await publishNotificationChange(String(job.recipient));
  }
}

export function startDeliveryWorker() {
  let busy = false;
  const tick = async () => {
    if (busy) return; busy = true;
    try { await runDeliveryWorkerPass(); } catch { console.error('Notification worker pass failed; durable records will be checked again.'); }
    finally { busy = false; }
  };
  const timer = setInterval(tick, 5000); timer.unref(); void tick();
  return () => clearInterval(timer);
}
