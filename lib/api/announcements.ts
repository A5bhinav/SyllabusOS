import apiClient from './client';
import type {
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/types/api';

/**
 * Get all announcements
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  const response = await apiClient.get<Announcement[]>('/announcements');
  return response.data;
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  data: CreateAnnouncementRequest
): Promise<Announcement> {
  const response = await apiClient.post<Announcement>('/announcements', data);
  return response.data;
}

/**
 * Update an announcement
 */
export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncementRequest
): Promise<Announcement> {
  const response = await apiClient.put<Announcement>(
    `/announcements/${id}`,
    data
  );
  return response.data;
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  await apiClient.delete(`/announcements/${id}`);
}
