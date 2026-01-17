import apiClient from './client';
import type { Escalation } from '@/types/api';

export interface EscalationsResponse {
  escalations: Escalation[];
  patterns?: Array<{
    category: string;
    count: number;
  }>;
}

/**
 * Get all escalations
 * Returns escalations with optional pattern detection data
 */
export async function getEscalations(): Promise<EscalationsResponse> {
  const response = await apiClient.get<EscalationsResponse | Escalation[]>('/escalations');
  
  // Handle backward compatibility: if response is array, wrap it
  if (Array.isArray(response.data)) {
    return {
      escalations: response.data,
    };
  }
  
  return response.data;
}

/**
 * Resolve an escalation
 */
export async function resolveEscalation(id: string): Promise<void> {
  await apiClient.put('/escalations', { 
    escalationId: id,
    status: 'resolved' 
  });
}

/**
 * Update escalation response
 */
export async function updateEscalationResponse(
  id: string, 
  response: string, 
  status?: 'pending' | 'resolved'
): Promise<void> {
  await apiClient.put('/escalations', {
    escalationId: id,
    response,
    ...(status && { status })
  });
}
