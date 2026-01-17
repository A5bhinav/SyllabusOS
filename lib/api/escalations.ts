import apiClient from './client';
import type { Escalation } from '@/types/api';

/**
 * Get all escalations
 */
export async function getEscalations(): Promise<Escalation[]> {
  const response = await apiClient.get<Escalation[]>('/escalations');
  return response.data;
}

/**
 * Resolve an escalation
 */
export async function resolveEscalation(id: string): Promise<void> {
  await apiClient.put(`/escalations/${id}`, { status: 'resolved' });
}
