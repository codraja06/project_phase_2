import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { Schema, Types } from 'mongoose';

// Request objects remain in memory only. Never persist bodies, headers or tokens.
export const auditContext = new AsyncLocalStorage<{ req: any; requestId: string }>();
const allowed = ['status', 'category', 'assignedDepartment', 'verified', 'completionReview', 'duplicateOf', 'department', 'enabled', 'isAdmin', 'role'];
const snapshot = (doc: any) => Object.fromEntries(allowed.filter(key => doc?.[key] !== undefined).map(key => [key, doc[key]]));

export function durableAuditPlugin(schema: Schema, options: { entity: string }) {
  schema.set('optimisticConcurrency', true);
  schema.add({ auditPending: { type: [Schema.Types.Mixed], select: false, default: undefined } });
  schema.index({ 'auditPending.0': 1 });
  function event(before: any, after: any, entityId: any) {
    const context = auditContext.getStore(), req = context?.req;
    if (!context || !req?.user || !['POST', 'PUT', 'PATCH'].includes(req.method)) return null;
    // These are known route suffixes, not arbitrary URL or request data.
    const suffix = String(req.path).split('/').filter(Boolean).pop() || '';
    const action = options.entity === 'Complaint' ? ({ status: 'status-updated', verify: 'complaint-verified', department: 'department-assigned', triage: 'triage-reviewed', duplicate: 'duplicate-confirmed', completion: 'repair-uploaded', review: 'repair-reviewed' } as any)[suffix] || 'complaint-submitted'
      : options.entity === 'DepartmentRule' ? 'routing-updated' : 'account-updated';
    return { _id: new Types.ObjectId(), actor: req.user._id, role: req.user.role, action,
      entity: options.entity, entityId, department: after?.assignedDepartment || after?.department || before?.assignedDepartment || before?.department || '',
      before: snapshot(before), after: snapshot(after), at: new Date(), requestId: context.requestId,
      // Never copy free-form request content into centralized diagnostic storage.
      reason: typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : 'Recorded application operation' };
  }
  schema.pre('save', async function () {
    if (!auditContext.getStore()?.req?.user) return;
    const before = this.isNew ? null : await (this.constructor as any).findById(this._id).lean();
    const entry = event(before, this, this._id);
    if (entry) {
      // Preserve pending events even when this document was loaded without the hidden outbox.
      const pending = this.isNew ? [] : (await (this.constructor as any).findById(this._id).select('auditPending').lean())?.auditPending || [];
      this.set('auditPending', [...pending, entry]);
    }
  });
  schema.pre('findOneAndUpdate', async function () {
    if (!auditContext.getStore()?.req?.user) return;
    const update: any = this.getUpdate();
    if (!update || Array.isArray(update)) return;
    const before = await this.model.findOne(this.getFilter()).lean();
    if (!before && !this.getOptions().upsert) return;
    const id = (before as any)?._id || new Types.ObjectId();
    const after = { ...before, ...update.$set };
    const entry = event(before, after, id);
    if (!entry) return;
    if (!before) update.$setOnInsert = { ...update.$setOnInsert, _id: id };
    if (update.$setOnInsert) delete update.$setOnInsert.__v;
    update.$inc = { ...update.$inc, __v: 1 };
    update.$push = { ...update.$push, auditPending: entry };
    this.setUpdate(update);
  });
}

export const newAuditRequestId = randomUUID;
