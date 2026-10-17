import { axiosClient } from './axiosClient';
import { ENDPOINTS } from '../constants/endpoints';
import { Complaint, ComplaintStats } from '../types/complaint';
import { AnalyticsData, AnalyticsQuery } from '../types/analytics';

// axiosClient returns response.data = { success, data: ... }
export const authorityApi = {
  async getAnalytics(params: AnalyticsQuery): Promise<AnalyticsData> {
    const response: any = await axiosClient.get('/authority/analytics', { params }); return response.data;
  },
  async getAllComplaints(params?: {
    status?: string;
    category?: string;
    search?: string;
    sortBy?: string;
    priority?: string;
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }): Promise<{ complaints: Complaint[]; stats: ComplaintStats; pagination?: { page: number; pages: number; total: number; limit: number } }> {
    const envelope: any = await axiosClient.get(ENDPOINTS.AUTHORITY.COMPLAINTS, { params });
    return envelope.data;
  },

  async getComplaintById(id: string): Promise<Complaint> {
    const envelope: any = await axiosClient.get(ENDPOINTS.AUTHORITY.COMPLAINT_DETAIL(id));
    return envelope.data;
  },

  async updateStatus(id: string, status: string): Promise<Complaint> {
    const envelope: any = await axiosClient.patch(ENDPOINTS.AUTHORITY.UPDATE_STATUS(id), { status });
    return envelope.data;
  },

  async updateComplaintStatus(id: string, status: string): Promise<Complaint> {
    return this.updateStatus(id, status);
  },

  async verifyComplaint(id: string): Promise<Complaint> {
    const envelope: any = await axiosClient.patch(ENDPOINTS.AUTHORITY.VERIFY(id));
    return envelope.data;
  },

  async deleteComplaint(id: string): Promise<void> {
    await axiosClient.delete(ENDPOINTS.AUTHORITY.DELETE_COMPLAINT(id));
  },
};
