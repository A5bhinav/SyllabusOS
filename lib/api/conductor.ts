import apiClient from './client';
import type { ConductorRequest, ConductorResponse } from '@/types/api';

/**
 * Trigger Sunday Night Conductor manually
 */
export async function triggerConductor(
  data?: ConductorRequest
): Promise<ConductorResponse> {
  const response = await apiClient.post<ConductorResponse>(
    '/conductor',
    data || {}
  );
  return response.data;
}
