import apiClient from './client';
import type { PulseResponse } from '@/types/api';

/**
 * Get pulse report data
 */
export async function getPulseReport(): Promise<PulseResponse> {
  const response = await apiClient.get<PulseResponse>('/pulse');
  return response.data;
}
