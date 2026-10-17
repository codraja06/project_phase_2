import { DetectionResult, SeverityAssessment } from './ai';

export type ComplaintCategory =
  | 'pothole'
  | 'road_damage'
  | 'garbage'
  | 'garbage_overflow'
  | 'broken_streetlight'
  | 'drainage'
  | 'drainage_problem'
  | 'water_leakage'
  | 'other'
  | string;

export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ComplaintUserRef {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Complaint {
  _id: string;
  complaintId?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  customCategory?: string;
  imageUrl: string;
  aiDetected?: boolean;
  aiClass?: string;
  aiConfidence: number;
  boundingBoxes: DetectionResult[];
  latitude: number;
  longitude: number;
  address: string;
  status: ComplaintStatus;
  priority?: ComplaintPriority;
  priorityScore?: number;
  priorityMetadata?: { reviewRequired: boolean; ageScore: number; severityScore: number; categoryScore: number };
  severity?: SeverityAssessment;
  severityReview?: { level: 'Low' | 'Medium' | 'High'; reason: string; at: string; by: string };
  priorityOverride?: { level: 'low' | 'medium' | 'high'; reason: string; at: string; by: string } | null;
  auditHistory?: { action: string; at: string; by?: string; before?: string; after?: string; reason: string }[];
  generatedDescription?: string;
  verified?: boolean;
  createdBy?: string | ComplaintUserRef;
  citizenId?: string | ComplaintUserRef;
  officerId?: string | ComplaintUserRef | null;
  resolvedAt?: string | null;
  duplicateOf?: string | null;
  duplicateReference?: string | null;
  duplicateConfirmedAt?: string | null;
  duplicateReason?: string;
  assignedDepartment?: string;
  assignedAt?: string | null;
  completionImageUrl?: string;
  completionSubmittedAt?: string | null;
  completionReview?: 'pending' | 'accepted' | 'rejected' | null;
  completionReviewNote?: string;
  statusHistory?: { status: ComplaintStatus; at: string; by?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  highPriority?: number;
  today?: number;
  verifiedCount?: number;
  categoryStats?: Record<string, number>;
}
