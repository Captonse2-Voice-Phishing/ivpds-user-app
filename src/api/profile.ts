import { apiClient } from './client';
import { API_PREFIX } from './config';
import type { ChangePasswordRequest, UpdateProfileRequest, UserProfile } from './types';

export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>(`${API_PREFIX}/users/me`);
  return response.data;
}

// Chỉ gửi trường muốn đổi. Gửi phoneNumber rỗng thì backend xóa số điện thoại.
export async function updateProfile(changes: UpdateProfileRequest): Promise<UserProfile> {
  const response = await apiClient.patch<UserProfile>(`${API_PREFIX}/users/me`, changes);
  return response.data;
}

// Thành công thì backend thu hồi mọi phiên (refresh token); phải đăng nhập lại.
export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await apiClient.post(`${API_PREFIX}/auth/change-password`, body);
}
