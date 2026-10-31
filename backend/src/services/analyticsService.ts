import { z } from 'zod';
import { Complaint } from '../models/Complaint';
import { priorityScoreExpression, withPriority } from './triageService';
import { env } from '../config/env';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Enter a valid date as YYYY-MM-DD');
export const analyticsQuery = z.object({
  from: day.optional(), to: day.optional(), search: z.string().max(200).optional(),
  department: z.string().trim().max(100).optional(), category: z.string().max(80).optional(), status: z.enum(['all', 'Pending', 'In Progress', 'Resolved']).optional(),
}).refine(q => !q.from || !q.to || q.from <= q.to, { message: 'Start date must be before end date' });

export function analyticsFilter(query: z.infer<typeof analyticsQuery>) {
  const filter: any = {};
  if (query.from || query.to) filter.createdAt = {
    ...(query.from ? { $gte: new Date(query.from) } : {}),
    ...(query.to ? { $lt: new Date(new Date(query.to).getTime() + 86400000) } : {}),
  };
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.category && query.category !== 'all') filter.category = query.category;
  if (query.department) filter.assignedDepartment = query.department;
  if (query.search) {
    const literal = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['title', 'description', 'complaintId', 'address'].map(field => ({ [field]: { $regex: literal, $options: 'i' } }));
  }
  return filter;
}

export async function complaintAnalytics(query: z.infer<typeof analyticsQuery>, scope: { assignedDepartment?: string } = {}) {
  const now = new Date();
  const target = env.RESOLUTION_TARGET_HOURS && Number.isFinite(env.RESOLUTION_TARGET_HOURS) && env.RESOLUTION_TARGET_HOURS > 0 ? env.RESOLUTION_TARGET_HOURS : null;
  const [result] = await Complaint.aggregate([
    { $match: { $and: [analyticsFilter(query), scope] } },
    { $addFields: { computedPriorityScore: priorityScoreExpression(now) } },
    { $facet: {
      summary: [{ $group: { _id: null, total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
        unresolved: { $sum: { $cond: [{ $ne: ['$status', 'Resolved'] }, 1, 0] } },
        overdue: { $sum: { $cond: [target ? { $and: [{ $ne: ['$status', 'Resolved'] }, { $lt: ['$createdAt', new Date(now.getTime() - target * 3600000)] }] } : false, 1, 0] } },
        highPriority: { $sum: { $cond: [{ $gte: ['$computedPriorityScore', 65] }, 1, 0] } },
        averageResolutionHours: { $avg: { $cond: [{ $and: [
          { $eq: ['$status', 'Resolved'] }, { $ne: ['$resolvedAt', null] }, { $gte: ['$resolvedAt', '$createdAt'] },
        ] }, { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] }, null] } },
      } }],
      unresolvedAge: [
        { $match: { status: { $ne: 'Resolved' } } },
        { $group: { _id: null, averageHours: { $avg: { $max: [0, { $divide: [{ $subtract: [now, '$createdAt'] }, 3600000] }] } }, oldestHours: { $max: { $max: [0, { $divide: [{ $subtract: [now, '$createdAt'] }, 3600000] }] } } } },
      ],
      resolutionByCategory: [
        { $match: { status: 'Resolved', resolvedAt: { $type: 'date' }, $expr: { $gte: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: '$category', resolved: { $sum: 1 }, averageHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } } },
        { $sort: { resolved: -1 } },
      ],
      durationCount: [{ $match: { status: 'Resolved', resolvedAt: { $type: 'date' }, $expr: { $gte: ['$resolvedAt', '$createdAt'] } } }, { $count: 'count' }],
      categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
      trends: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 90 }, { $sort: { _id: 1 } }],
      geography: [
        { $match: { latitude: { $type: 'number', $gte: -90, $lte: 90 }, longitude: { $type: 'number', $gte: -180, $lte: 180 }, $nor: [{ latitude: 0, longitude: 0 }] } },
        { $group: { _id: { lat: { $round: ['$latitude', 1] }, lng: { $round: ['$longitude', 1] } }, count: { $sum: 1 }, latitude: { $avg: '$latitude' }, longitude: { $avg: '$longitude' } } },
        { $sort: { count: -1 } }, { $limit: 100 },
      ],
      resolutionByDepartment: [
        { $match: { status: 'Resolved', resolvedAt: { $type: 'date' }, createdAt: { $type: 'date' }, assignedDepartment: { $type: 'string', $ne: '' } } },
        { $match: { $expr: { $gte: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: '$assignedDepartment', resolved: { $sum: 1 }, averageHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } } },
        { $sort: { resolved: -1, _id: 1 } }, { $limit: 30 },
      ],
      resolutionTrends: [
        { $match: { status: 'Resolved', resolvedAt: { $type: 'date' }, createdAt: { $type: 'date' } } },
        { $match: { $expr: { $gte: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt', timezone: 'UTC' } },
          count: { $sum: 1 }, averageHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } } },
        { $sort: { _id: -1 } }, { $limit: 90 }, { $sort: { _id: 1 } },
      ],
      recent: [{ $sort: { createdAt: -1, _id: 1 } }, { $limit: 8 }, { $project: { computedPriorityScore: 0 } }],
    } },
  ]);
  const summary = result.summary[0] || { total: 0, pending: 0, inProgress: 0, resolved: 0, unresolved: 0, overdue: 0, highPriority: 0, averageResolutionHours: null };
  delete summary._id;
  const count = result.durationCount[0]?.count || 0;
  let medianResolutionHours: number | null = null;
  if (count) {
    const middle = await Complaint.aggregate([
      { $match: { $and: [analyticsFilter(query), scope], status: 'Resolved', resolvedAt: { $type: 'date' }, $expr: { $gte: ['$resolvedAt', '$createdAt'] } } },
      { $project: { hours: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] } } },
      { $sort: { hours: 1, _id: 1 } }, { $skip: Math.floor((count - 1) / 2) }, { $limit: count % 2 ? 1 : 2 },
    ]);
    medianResolutionHours = middle.length ? middle.reduce((sum, row) => sum + row.hours, 0) / middle.length : null;
  }
  return { summary, medianResolutionHours, unresolvedAge: result.unresolvedAge[0] || { averageHours: null, oldestHours: null },
    resolutionByCategory: result.resolutionByCategory.map((row: any) => ({ category: row._id, resolved: row.resolved, averageHours: row.averageHours })), categories: result.categories.map((c: any) => ({ category: c._id || 'other', count: c.count })),
    trends: result.trends.map((t: any) => ({ date: t._id, count: t.count })),
    geography: result.geography.map((g: any) => ({ latitude: g.latitude, longitude: g.longitude, count: g.count,
      label: `${g._id.lat.toFixed(1)}, ${g._id.lng.toFixed(1)}` })),
    resolutionByDepartment: result.resolutionByDepartment.map((d: any) => ({ department: d._id, resolved: d.resolved, averageHours: d.averageHours })),
    resolutionTrends: result.resolutionTrends.map((t: any) => ({ date: t._id, resolved: t.count, averageHours: t.averageHours })),
    recent: result.recent.map((c: any) => withPriority(c, now)),
    filters: query, calculatedAt: now, trendTimezone: 'UTC', geographyLimit: 100, resolutionTargetHours: target,
  };
}
