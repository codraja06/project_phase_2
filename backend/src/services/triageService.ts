import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

export interface SeverityAssessment {
  level: 'Low' | 'Medium' | 'High' | null;
  state: 'estimated' | 'uncertain' | 'unavailable';
  method: string;
  validated: boolean;
  reason: string;
  evidence: { category: string; detectionConfidence: number; imageCoverage: number; model: string }[];
  assessedAt?: string;
  imageHash?: string;
}

export const unavailableSeverity = (): SeverityAssessment => ({
  level: null, state: 'unavailable', method: 'detection-triage-v1', validated: false,
  reason: 'Severity unavailable; authority review required.', evidence: [],
});

// Separate audiences prevent authentication tokens being used as evidence tokens.
export const signEvidence = (data: object, audience: 'analysis' | 'upload', userId: string) =>
  jwt.sign(data, env.JWT_SECRET, { audience, subject: userId, expiresIn: '24h' });

export const readEvidence = (token: string, audience: 'analysis' | 'upload', userId: string): any => {
  try {
    return jwt.verify(token, env.JWT_SECRET, { audience, subject: userId, algorithms: ['HS256'] });
  } catch {
    throw new ApiError(400, 'Image analysis has expired or is invalid. Analyze the photo again or submit manually.');
  }
};

const categoryWeight: Record<string, number> = {
  pothole: 15, road_damage: 15, garbage: 5, garbage_overflow: 10,
  broken_streetlight: 10, drainage: 10, drainage_problem: 10,
  water_leakage: 10, dead_animal: 15, broken_tree: 15,
};

// Same versioned policy as calculatePriority, expressed for Mongo aggregation.
export const priorityScoreExpression = (now = new Date()): any => {
  const ageDays = { $max: [0, { $floor: { $divide: [
    { $subtract: [now, { $ifNull: ['$createdAt', now] }] }, 86400000,
  ] } }] };
  const age = { $min: [60, { $multiply: [3, ageDays] }] };
  const severity = { $switch: { branches: [
    { case: { $eq: ['$severity.level', 'High'] }, then: 65 },
    { case: { $eq: ['$severity.level', 'Medium'] }, then: 35 },
    { case: { $eq: ['$severity.level', 'Low'] }, then: 10 },
  ], default: 25 } };
  const category = { $switch: { branches: Object.entries(categoryWeight).map(([key, score]) => ({ case: { $eq: ['$category', key] }, then: score })), default: 5 } };
  return { $cond: [{ $eq: ['$status', 'Resolved'] }, 0, { $min: [100, { $add: [severity, category, age] }] }] };
};

export const calculatePriority = (complaint: {
  severity?: SeverityAssessment; category: string; createdAt?: Date | string;
  status: string; resolvedAt?: Date | string | null;
}, now = new Date()) => {
  const severityPoints = { Low: 10, Medium: 35, High: 65 };
  const level = complaint.severity?.level;
  const severityScore = level ? severityPoints[level] : 25;
  // Resolved complaints leave the attention queue and stop accruing age points.
  const end = complaint.status === 'Resolved' ? new Date(complaint.resolvedAt || complaint.createdAt || now) : now;
  const ageDays = Math.max(0, (end.getTime() - new Date(complaint.createdAt || now).getTime()) / 86400000);
  const ageScore = Math.min(60, Math.floor(Number.isFinite(ageDays) ? ageDays : 0) * 3);
  const categoryScore = categoryWeight[complaint.category] ?? 5;
  const priorityScore = complaint.status === 'Resolved' ? 0 : Math.min(100, severityScore + ageScore + categoryScore);
  const priority = priorityScore >= 65 ? 'high' : priorityScore >= 30 ? 'medium' : 'low';
  return { priority, priorityScore, priorityMetadata: {
    method: 'triage-priority-v1', calculatedAt: now, severityScore, ageScore, categoryScore,
    reviewRequired: !level, resolved: complaint.status === 'Resolved',
  } };
};

export const withPriority = (complaint: any, now = new Date()) => {
  const data = typeof complaint.toObject === 'function' ? complaint.toObject() : complaint;
  return { ...data, severity: data.severity || unavailableSeverity(), ...calculatePriority(data, now) };
};
