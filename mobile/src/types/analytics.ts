import { Complaint } from './complaint';
export interface AnalyticsQuery { from?: string; to?: string; search?: string; status?: string; category?: string }
export interface AnalyticsData {
  summary: { total: number; pending: number; inProgress: number; resolved: number; unresolved: number; overdue: number; highPriority: number; averageResolutionHours: number | null };
  categories: { category: string; count: number }[];
  trends: { date: string; count: number }[];
  geography: { latitude: number; longitude: number; count: number; label: string }[];
  recent: Complaint[]; calculatedAt: string; trendTimezone: string;
  resolutionByDepartment: { department: string; resolved: number; averageHours: number }[];
  resolutionTrends: { date: string; resolved: number; averageHours: number }[];
  resolutionTargetHours: number | null;
}
