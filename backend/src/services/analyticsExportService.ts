import { z } from 'zod';
import { Complaint } from '../models/Complaint';
import { analyticsFilter, analyticsQuery } from './analyticsService';
import { calculatePriority } from './triageService';
import { ApiError } from '../utils/apiError';

const columns = ['complaint_id', 'category', 'status', 'department', 'severity', 'priority', 'priority_score',
  'created_at_utc', 'assigned_at_utc', 'resolved_at_utc', 'resolution_hours', 'latitude', 'longitude', 'verified', 'duplicate_confirmed'];
const cell = (value: unknown) => {
  if (value === undefined || value === null) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const date = (value: unknown) => {
  if (!value) return '';
  const parsed = new Date(value as any);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : '';
};

export async function exportAnalyticsCsv(query: z.infer<typeof analyticsQuery>) {
  const lines = [columns.join(',')];
  const now = new Date();
  const cursor = Complaint.find(analyticsFilter(query)).select('complaintId category status assignedDepartment severity severityReview priorityOverride createdAt assignedAt resolvedAt latitude longitude verified duplicateOf').sort({ createdAt: 1, _id: 1 }).lean().cursor();
  for await (const report of cursor) {
    if (lines.length > 50000) { await cursor.close(); throw new ApiError(413, 'More than 50,000 reports match. Narrow the date range and export again.'); }
    const priority = calculatePriority(report, now);
    const created = date(report.createdAt), resolved = date(report.resolvedAt);
    const hours = report.status === 'Resolved' && created && resolved && new Date(resolved).getTime() >= new Date(created).getTime()
      ? Number(((new Date(resolved).getTime() - new Date(created).getTime()) / 3600000).toFixed(4)) : null;
    lines.push([report.complaintId, report.category, report.status, report.assignedDepartment,
      report.severityReview?.level || report.severity?.level, priority.priority, priority.priorityScore,
      created, date(report.assignedAt), resolved, hours, report.latitude, report.longitude,
      !!report.verified, !!report.duplicateOf].map(cell).join(','));
  }
  return { csv: '\uFEFF' + lines.join('\r\n') + '\r\n', rowCount: lines.length - 1 };
}
