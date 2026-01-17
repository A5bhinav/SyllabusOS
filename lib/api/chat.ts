import apiClient from './client';
import type { ChatRequest, ChatResponse } from '@/types/api';
import type { Message } from '@/components/student/MessageBubble';

/**
 * Send chat message and get AI response
 */
export async function sendChatMessage(
  data: ChatRequest
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/chat', data);
  return response.data;
}

/**
 * Get chat history for a course and user
 */
export async function getChatHistory(
  courseId: string,
  userId: string,
  limit: number = 50
): Promise<{ messages: Message[] }> {
  const response = await apiClient.get<{ messages: Message[] }>('/chat/history', {
    params: {
      courseId,
      userId,
      limit,
    },
  });
  return response.data;
}
