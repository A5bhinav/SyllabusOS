import apiClient from './client';
import type { UploadRequest, UploadResponse } from '@/types/api';

/**
 * Upload syllabus PDF and schedule CSV
 */
export async function uploadFiles(
  data: UploadRequest
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('syllabus', data.syllabus);
  formData.append('schedule', data.schedule);
  if (data.courseId) {
    formData.append('courseId', data.courseId);
  }

  const response = await apiClient.post<UploadResponse>(
    '/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}
