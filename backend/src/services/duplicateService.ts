import mongoose from 'mongoose';
import { Complaint } from '../models/Complaint';
import { env } from '../config/env';
import { compareFingerprints } from './imageSimilarityService';

const validLocation = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radians = Math.PI / 180;
  const deltaLat = (lat2 - lat1) * radians, deltaLng = (lng2 - lng1) * radians;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function possibleDuplicates(input: { category: string; latitude: number; longitude: number; imageFingerprint?: unknown }, userId: mongoose.Types.ObjectId, authority = false, scope: { assignedDepartment?: string } = {}) {
  if (input.category === 'other') return { matches: [], reason: 'Generic issue categories cannot be compared reliably. Authority review is available after submission.' };
  if (!validLocation(input.latitude, input.longitude)) return { matches: [], reason: 'A valid GPS location is needed to check nearby reports.' };
  const radius = Number.isFinite(env.DUPLICATE_RADIUS_METERS) && env.DUPLICATE_RADIUS_METERS > 0 ? Math.min(env.DUPLICATE_RADIUS_METERS, 2000) : 120;
  const days = Number.isFinite(env.DUPLICATE_LOOKBACK_DAYS) && env.DUPLICATE_LOOKBACK_DAYS > 0 ? Math.min(env.DUPLICATE_LOOKBACK_DAYS, 365) : 30;
  const latSpan = radius / 111000;
  const lngSpan = radius / Math.max(10000, 111000 * Math.cos(input.latitude * Math.PI / 180));
  const candidates = await Complaint.find({ ...scope, category: input.category, status: { $ne: 'Resolved' },
    createdAt: { $gte: new Date(Date.now() - days * 86400000) },
    latitude: { $gte: input.latitude - latSpan, $lte: input.latitude + latSpan },
    longitude: { $gte: input.longitude - lngSpan, $lte: input.longitude + lngSpan },
  }).select('complaintId createdBy status latitude longitude createdAt imageFingerprint').limit(500).lean();
  const matches = candidates.map(c => ({ c, distance: distanceMeters(input.latitude, input.longitude, c.latitude, c.longitude), comparison: compareFingerprints(input.imageFingerprint, c.imageFingerprint) }))
    .filter(item => item.distance <= radius && (!item.comparison || item.comparison.similar)).sort((a, b) => a.distance - b.distance).slice(0, 5)
    .map(({ c, distance, comparison }) => ({
      complaintId: authority || c.createdBy.toString() === userId.toString() ? c.complaintId : null,
      id: authority || c.createdBy.toString() === userId.toString() ? c._id : null,
      distanceMeters: Math.round(distance), status: c.status,
      disclosure: authority || c.createdBy.toString() === userId.toString() ? 'own' : 'nearby',
      imageComparison: comparison ? 'similar' : 'unavailable',
      similarity: comparison ? { hashDistance: comparison.hashDistance, colorSimilarity: Number(comparison.colorSimilarity.toFixed(3)), method: 'dhash64-rgb48-v1' } : null,
    }));
  return { matches, reason: matches.length ? 'Nearby reports need review. Visual similarity is supporting evidence only; missing image signatures require manual comparison. No duplicate is confirmed automatically.' : 'No visually compatible nearby reports found. Missing or unavailable images cannot establish similarity.' };
}
