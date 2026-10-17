import { publishNotificationChange } from './liveNotifications';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

type Notice = { title: string; message: string; complaintId: mongoose.Types.ObjectId; eventKey: string };

export async function notifyUser(recipient: mongoose.Types.ObjectId, notice: Notice) {
  try {
    const result = await Notification.updateOne({ recipient, eventKey: notice.eventKey },
      { $setOnInsert: { ...notice, recipient } }, { upsert: true });
    if (result.upsertedCount) publishNotificationChange(String(recipient));
  } catch (error) { console.error('Notification write failed:', (error as Error).message); }
}

export async function notifyAuthorities(notice: Notice) {
  try {
    const authorities = await User.find({ role: 'authority' }).select('_id').lean();
    await Promise.all(authorities.map(user => notifyUser(user._id, notice)));
  } catch (error) { console.error('Authority notification write failed:', (error as Error).message); }
}
