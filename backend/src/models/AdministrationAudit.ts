import { Schema, model } from 'mongoose';

const schema = new Schema({
  action: { type: String, required: true },
  subject: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  source: { type: String, required: true },
}, { timestamps: true });
export const AdministrationAudit = model('AdministrationAudit', schema);
