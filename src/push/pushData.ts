import type { NotificationType } from '../api/types';

// Dữ liệu backend gửi kèm một thông báo đẩy.
export interface PushPayload {
  notificationId: string;
  type: NotificationType | string;
  callId: string | null;
  analysisId: string | null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

// Đọc dữ liệu kèm thông báo đẩy. Trả null nếu không phải thông báo của IVPDS
// (thiếu notificationId) để ứng dụng bỏ qua thay vì mở nhầm màn hình.
export function parsePushPayload(data: unknown): PushPayload | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  const notificationId = text(record.notificationId);
  if (!notificationId) return null;
  return {
    notificationId,
    type: text(record.type) ?? 'UNKNOWN',
    callId: text(record.callId),
    analysisId: text(record.analysisId),
  };
}
