import { axiosClient } from './axiosClient';
export interface ChatMessage { role: 'user' | 'assistant'; content: string; source: 'citizen' | 'provider-guided' | 'guide' | 'application'; createdAt: string }
export interface Conversation { _id?: string; messages: ChatMessage[] }
export const chatApi = {
  async getConversation(): Promise<Conversation> {
    const response: any = await axiosClient.get('/chat/conversation'); return response.data;
  },
  async send(message: string, conversationId?: string): Promise<{ conversation: Conversation; available: boolean; notice: string }> {
    const response: any = await axiosClient.post('/chat/messages', { message, conversationId }, { timeout: 30000 });
    return response.data;
  },
};
