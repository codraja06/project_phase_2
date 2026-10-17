import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

type Notice = { title: string; message: string; complaintId: mongoose.Types.ObjectId; eventKey: string };

export async function notifyUser(recipient: mongoose.Types.ObjectId, notice: Notice) {
  try {
    await Notification.updateOne({ recipient, eventKey: notice.eventKey },
      { $setOnInsert: { ...notice, recipient } }, { upsert: true });
  } catch (error) { console.error('Notification write failed:', (error as Error).message); }
}

export async function notifyAuthorities(notice: Notice) {
  try {
    const authorities = await User.find({ role: 'authority' }).select('_id').lean();
    if (authorities.length) await Notification.bulkWrite(authorities.map(user => ({ updateOne: {
      filter: { recipient: user._id, eventKey: notice.eventKey },
      update: { $setOnInsert: { ...notice, recipient: user._id } }, upsert: true,
    } })));
  } catch (error) { console.error('Authority notification write failed:', (error as Error).message); }
}
