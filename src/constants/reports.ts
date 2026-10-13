import type { ReportStatus } from '../api/types';
import type { Tone } from '../theme';

export const REPORT_STATUS: Record<ReportStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã chặn', tone: 'success' },
  REJECTED: { label: 'Không được duyệt', tone: 'neutral' },
};

export const REPORT_REASON_MAX_LENGTH = 1000;

// Câu riêng cho các mã lỗi của API báo cáo số.
export const REPORT_ERRORS: Record<string, string> = {
  NUMBER_ALREADY_REPORTED: 'Bạn đã báo cáo số này rồi.',
  PHONE_NUMBER_ALREADY_BLACKLISTED: 'Số này đã nằm trong danh sách đen.',
  TOO_MANY_PENDING_REPORTS: 'Bạn đang có quá nhiều báo cáo chờ duyệt. Hãy thử lại sau.',
  PHONE_NUMBER_MISMATCH: 'Số điện thoại không khớp với cuộc gọi này.',
};
