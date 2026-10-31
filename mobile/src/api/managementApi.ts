import { Platform } from 'react-native';
import { axiosClient } from './axiosClient';
import { Complaint } from '../types/complaint';

export interface CivicNotification {
  _id: string; title: string; message: string; complaintId: string; readAt?: string | null; createdAt: string;
  resolution?: { category: string; resolvedAt: string };
  deliveries?: { channel: 'email' | 'sms'; status: string; errorCode?: string; attempts: number }[];
}
export interface DuplicateMatch { id: string | null; complaintId: string | null; distanceMeters: number; status: string; disclosure: 'own' | 'nearby'; imageComparison?: 'similar' | 'unavailable'; similarity?: { hashDistance: number; colorSimilarity: number } | null }
export interface DepartmentRule { category: string; department: string; enabled: boolean; municipality?: string; verificationStatus?: 'proposed' | 'verified'; sourceNote?: string }
export interface HotspotCluster { latitude: number; longitude: number; count: number; records: { _id: string; complaintId: string; title: string; status: string; category: string }[] }

export const managementApi = {
  async setOfficerDepartment(email: string, department: string): Promise<void> {
    await axiosClient.put('/management/officers/department', { email, department });
  },
  async checkDuplicates(input: { category: string; latitude: number; longitude: number; uploadToken?: string }): Promise<{ matches: DuplicateMatch[]; reason: string }> {
    const envelope: any = await axiosClient.post('/management/duplicates/check', input); return envelope.data;
  },
  async reviewTriage(id: string, kind: 'severity' | 'priority', level: string | null, reason: string): Promise<Complaint> {
    const envelope: any = await axiosClient.patch(`/management/complaints/${id}/triage`, { kind, level, reason }); return envelope.data;
  },
  async confirmDuplicate(id: string, originalId: string, reason: string): Promise<Complaint> {
    const envelope: any = await axiosClient.patch(`/management/complaints/${id}/duplicate`, { originalId, reason }); return envelope.data;
  },
  async getDuplicateCandidates(id: string): Promise<{ matches: DuplicateMatch[]; reason: string }> {
    const envelope: any = await axiosClient.get(`/management/complaints/${id}/duplicates`); return envelope.data;
  },
  async getDepartments(): Promise<DepartmentRule[]> {
    const envelope: any = await axiosClient.get('/management/departments'); return envelope.data;
  },
  async saveDepartment(category: string, department: string, enabled = true, metadata: Partial<Pick<DepartmentRule, 'municipality' | 'verificationStatus' | 'sourceNote'>> = {}): Promise<DepartmentRule> {
    const envelope: any = await axiosClient.put(`/management/departments/${encodeURIComponent(category)}`, { department, enabled, ...metadata }); return envelope.data;
  },
  async assignDepartment(id: string, department: string, reason: string): Promise<Complaint> {
    const envelope: any = await axiosClient.patch(`/management/complaints/${id}/department`, { department, reason }); return envelope.data;
  },
  async uploadCompletion(id: string, uri: string): Promise<Complaint> {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      form.append('image', blob, `repair.${blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'}`);
    } else {
      const name = uri.split('/').pop() || 'repair.jpg';
      const type = name.toLowerCase().endsWith('.png') ? 'image/png' : name.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      form.append('image', { uri, name, type } as any);
    }
    const envelope: any = await axiosClient.post(`/management/complaints/${id}/completion`, form, { headers: { 'Content-Type': 'multipart/form-data' } }); return envelope.data;
  },
  async reviewCompletion(id: string, decision: 'accepted' | 'rejected', note: string): Promise<Complaint> {
    const envelope: any = await axiosClient.patch(`/management/complaints/${id}/completion/review`, { decision, note }); return envelope.data;
  },
  async getHotspots(params: { cellDegrees?: number; windowDays?: number; category?: string; status?: string; priority?: string; from?: string; to?: string }): Promise<{ clusters: HotspotCluster[]; cellDegrees: number; windowDays: number }> {
    const envelope: any = await axiosClient.get('/management/hotspots', { params }); return envelope.data;
  },
  async getNotifications(page = 1): Promise<{ notifications: CivicNotification[]; total: number; unread: number; pages: number }> {
    const envelope: any = await axiosClient.get('/management/notifications', { params: { page } }); return envelope.data;
  },
  async markNotificationRead(id: string): Promise<CivicNotification> {
    const envelope: any = await axiosClient.patch(`/management/notifications/${id}/read`); return envelope.data;
  },
};
