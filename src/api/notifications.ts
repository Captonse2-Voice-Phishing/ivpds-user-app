import { apiClient } from './client';
import { API_PREFIX } from './config';
import type {
  AppNotification,
  DevicePlatform,
  MarkAllReadResult,
  PageResponse,
  UnreadCount,
} from './types';

const NOTIFICATIONS = `${API_PREFIX}/notifications`;

export const NOTIFICATIONS_PAGE_SIZE = 20;

// Danh sách thông báo, mới nhất trước.
export async function getNotifications(page: number): Promise<PageResponse<AppNotification>> {
  const response = await apiClient.get<PageResponse<AppNotification>>(NOTIFICATIONS, {
    params: { page, size: NOTIFICATIONS_PAGE_SIZE },
  });
  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get<UnreadCount>(`${NOTIFICATIONS}/unread-count`);
  return response.data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const response = await apiClient.post<AppNotification>(`${NOTIFICATIONS}/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await apiClient.post<MarkAllReadResult>(`${NOTIFICATIONS}/read-all`);
  return response.data.marked;
}

// Đăng ký token thông báo đẩy của thiết bị; gọi lại với cùng token là an toàn.
export async function registerDevice(token: string, platform: DevicePlatform): Promise<void> {
  await apiClient.put(`${NOTIFICATIONS}/devices`, { token, platform });
}

// Gỡ token khi đăng xuất. axios tự mã hóa URL cho tham số (token có dấu ngoặc vuông).
export async function unregisterDevice(token: string): Promise<void> {
  await apiClient.delete(`${NOTIFICATIONS}/devices`, { params: { token } });
}
