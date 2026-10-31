import { Schema, model } from 'mongoose';
const schema = new Schema({
  actor: { type: Schema.Types.ObjectId, required: true }, role: { type: String, required: true },
  action: { type: String, required: true }, entity: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true }, department: String,
  before: Schema.Types.Mixed, after: Schema.Types.Mixed, at: { type: Date, required: true }, requestId: String, reason: String,
}, { versionKey: false });
schema.index({ at: -1, _id: -1 });
schema.index({ actor: 1, at: -1 });
schema.index({ action: 1, at: -1 });
schema.index({ entityId: 1, at: -1 });
schema.index({ department: 1, at: -1 });
export const AuditEvent = model('AuditEvent', schema);
