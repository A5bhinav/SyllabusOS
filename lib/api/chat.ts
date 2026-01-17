import apiClient from './client';
import type { ChatRequest, ChatResponse } from '@/types/api';

/**
 * Send chat message and get AI response
 */
export async function sendChatMessage(
  data: ChatRequest
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/chat', data);
  return response.data;
}
