import mongoose, { Schema, Document } from 'mongoose';
import { SeverityAssessment } from '../services/triageService';
import { NotificationIntentSchema, NotificationIntent } from './NotificationIntent';

export type ComplaintCategory =
  | 'pothole'
  | 'road_damage'
  | 'garbage'
  | 'garbage_overflow'
  | 'broken_streetlight'
  | 'drainage'
  | 'drainage_problem'
  | 'water_leakage'
  | 'dead_animal'
  | 'broken_tree'
  | 'other'
  | string;

export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IBoundingBox {
  category: string;
  className?: string;
  confidence: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  bbox?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  model?: string;
  modelVersion?: string;
}

export interface IComplaint extends Document {
  _id: mongoose.Types.ObjectId;
  complaintId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  customCategory?: string;
  imageUrl: string;
  aiDetected: boolean;
  aiClass?: string;
  aiConfidence: number;
  boundingBoxes: IBoundingBox[];
  latitude: number;
  longitude: number;
  address: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  severity?: SeverityAssessment;
  imageFingerprint?: Record<string, any>;
  severityReview?: { level: 'Low' | 'Medium' | 'High'; reason: string; at: Date; by: mongoose.Types.ObjectId } | null;
  priorityOverride?: { level: 'low' | 'medium' | 'high'; reason: string; at: Date; by: mongoose.Types.ObjectId } | null;
  auditHistory?: { action: string; at: Date; by?: mongoose.Types.ObjectId; before?: string; after?: string; reason: string }[];
  priorityScore?: number;
  priorityMetadata?: Record<string, any>;
  generatedDescription?: string;
  createdBy: mongoose.Types.ObjectId;
  citizenId?: mongoose.Types.ObjectId;
  officerId?: mongoose.Types.ObjectId | null;
  verified: boolean;
  resolvedAt?: Date | null;
  resolutionNoticePending?: boolean;
  resolutionNoticeAt?: Date | null;
  duplicateOf?: mongoose.Types.ObjectId | null;
  duplicateConfirmedAt?: Date | null;
  duplicateConfirmedBy?: mongoose.Types.ObjectId | null;
  duplicateReason?: string;
  assignedDepartment?: string;
  assignedDepartmentInfo?: { municipality: string; verificationStatus: 'proposed' | 'verified' } | null;
  assignedAt?: Date | null;
  assignedBy?: mongoose.Types.ObjectId | null;
  completionImageUrl?: string;
  completionSubmittedAt?: Date | null;
  completionSubmittedBy?: mongoose.Types.ObjectId | null;
  completionReview?: 'pending' | 'accepted' | 'rejected' | null;
  completionReviewedAt?: Date | null;
  completionReviewedBy?: mongoose.Types.ObjectId | null;
  completionReviewNote?: string;
  statusHistory?: { status: ComplaintStatus; at: Date; by?: mongoose.Types.ObjectId }[];
  notificationOutbox?: NotificationIntent[];
  notificationOutboxPending?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BoundingBoxSchema = new Schema<IBoundingBox>(
  {
    category: { type: String, default: 'issue' },
    className: { type: String },
    confidence: { type: Number, required: true },
    x1: { type: Number, required: true },
    y1: { type: Number, required: true },
    x2: { type: Number, required: true },
    y2: { type: Number, required: true },
    bbox: {
      x1: { type: Number, default: 0 },
      y1: { type: Number, default: 0 },
      x2: { type: Number, default: 0 },
      y2: { type: Number, default: 0 },
    },
    model: { type: String },
    modelVersion: { type: String },
  },
  { _id: false }
);

const ComplaintSchema = new Schema<IComplaint>(
  {
    complaintId: {
      type: String,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    customCategory: { type: String, trim: true, default: '' },
    imageUrl: { type: String, required: true },
    aiDetected: { type: Boolean, default: false },
    aiClass: { type: String, trim: true, default: '' },
    aiConfidence: { type: Number, required: true, default: 0 },
    boundingBoxes: [BoundingBoxSchema],
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, required: true, default: 'Location details captured' },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    severity: { type: new Schema({
      level: { type: String, enum: ['Low', 'Medium', 'High', null], default: null },
      state: { type: String, enum: ['estimated', 'uncertain', 'unavailable'], required: true },
      method: { type: String, required: true },
      validated: { type: Boolean, default: false },
      reason: { type: String, required: true },
      assessedAt: { type: String },
      imageHash: { type: String },
      evidence: [new Schema({
        category: { type: String, required: true },
        detectionConfidence: { type: Number, min: 0, max: 1, required: true },
        imageCoverage: { type: Number, min: 0, max: 1, required: true },
        model: { type: String, required: true },
      }, { _id: false })],
    }, { _id: false }) },
    priorityScore: { type: Number, min: 0, max: 100 },
    priorityMetadata: { type: new Schema({
      method: { type: String, required: true },
      calculatedAt: { type: Date, required: true },
      severityScore: { type: Number, min: 0, max: 100 },
      ageScore: { type: Number, min: 0, max: 60 },
      categoryScore: { type: Number, min: 0, max: 100 },
      reviewRequired: { type: Boolean },
      resolved: { type: Boolean },
      recommendationScore: { type: Number },
      authorityOverride: { type: Boolean },
      severitySource: { type: String },
    }, { _id: false }) },
    generatedDescription: { type: String, default: '' },
    imageFingerprint: { type: new Schema({ method: String, hash: String, histogram: [Number] }, { _id: false }) },
    severityReview: { type: new Schema({ level: { type: String, enum: ['Low', 'Medium', 'High'], required: true }, reason: { type: String, required: true }, at: { type: Date, required: true }, by: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { _id: false }), default: null },
    priorityOverride: { type: new Schema({ level: { type: String, enum: ['low', 'medium', 'high'], required: true }, reason: { type: String, required: true }, at: { type: Date, required: true }, by: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { _id: false }), default: null },
    auditHistory: [{ _id: false, action: { type: String, required: true }, at: { type: Date, required: true }, by: { type: Schema.Types.ObjectId, ref: 'User' }, before: String, after: String, reason: { type: String, required: true } }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    officerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verified: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
      resolutionNoticePending: { type: Boolean, default: false },
      resolutionNoticeAt: { type: Date, default: null },
    notificationOutbox: { type: [NotificationIntentSchema], default: undefined, select: false },
    notificationOutboxPending: { type: Boolean, default: false, select: false },
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Complaint', default: null },
    duplicateConfirmedAt: { type: Date, default: null },
    duplicateConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    duplicateReason: { type: String, trim: true, default: '' },
    assignedDepartment: { type: String, trim: true, default: '' },
    assignedDepartmentInfo: { type: new Schema({ municipality: String, verificationStatus: { type: String, enum: ['proposed', 'verified'] } }, { _id: false }), default: null },
    assignedAt: { type: Date, default: null },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completionImageUrl: { type: String, default: '' },
    completionSubmittedAt: { type: Date, default: null },
    completionSubmittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completionReview: { type: String, enum: ['pending', 'accepted', 'rejected', null], default: null },
    completionReviewedAt: { type: Date, default: null },
    completionReviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completionReviewNote: { type: String, trim: true, default: '' },
    statusHistory: [{ _id: false, status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], required: true }, at: { type: Date, required: true }, by: { type: Schema.Types.ObjectId, ref: 'User' } }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ComplaintSchema.index({ createdAt: -1 });
ComplaintSchema.index({ status: 1, createdAt: -1 });
ComplaintSchema.index({ category: 1, createdAt: -1 });
ComplaintSchema.index({ createdBy: 1, createdAt: -1 });
ComplaintSchema.index({ category: 1, status: 1, createdAt: -1 });
ComplaintSchema.index({ assignedDepartment: 1, resolvedAt: -1 });
ComplaintSchema.index({ latitude: 1, longitude: 1, createdAt: -1 });
ComplaintSchema.index({ duplicateOf: 1 });

// Virtual citizenId pointing to createdBy
ComplaintSchema.virtual('citizenId').get(function () {
  return this.createdBy;
});

// Pre-save auto-generate complaintId if not present (CIV-100245)
ComplaintSchema.pre('validate', function (next) {
  if (!this.complaintId) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.complaintId = `CIV-${randomNum}`;
  }
  next();
});

ComplaintSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret: Record<string, any>) {
    delete ret.__v;
    delete ret.notificationOutbox;
    delete ret.notificationOutboxPending;
    return ret;
  },
});

ComplaintSchema.index({ status: 1, resolutionNoticePending: 1 });
ComplaintSchema.index({ notificationOutboxPending: 1 });

export const Complaint = mongoose.model<IComplaint>('Complaint', ComplaintSchema);
