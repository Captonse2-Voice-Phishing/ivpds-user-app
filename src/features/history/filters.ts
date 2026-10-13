import type { HistoryQuery } from '../../api/types';

// Chip lọc nhanh: bốn mục đầu đặt riskLevel, "Lỗi" đặt status=FAILED.
export type QuickFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'FAILED';

export const QUICK_FILTERS: readonly { value: QuickFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'HIGH', label: 'Nguy cơ cao' },
  { value: 'MEDIUM', label: 'Đáng ngờ' },
  { value: 'LOW', label: 'Chưa thấy dấu hiệu' },
  { value: 'FAILED', label: 'Lỗi' },
];

export interface HistoryFilters {
  quick: QuickFilter;
  // Khoảng ngày gửi lên (tính cả hai ngày đầu mút, theo giờ của máy).
  from: Date | null;
  to: Date | null;
  callerNumber: string;
}

export const EMPTY_FILTERS: HistoryFilters = { quick: 'ALL', from: null, to: null, callerNumber: '' };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// Đổi bộ lọc trên giao diện thành tham số của GET /history; chỉ gửi tham số có giá trị.
export function toHistoryQuery(filters: HistoryFilters): HistoryQuery {
  const query: HistoryQuery = {};
  if (filters.quick === 'FAILED') query.status = 'FAILED';
  else if (filters.quick !== 'ALL') query.riskLevel = filters.quick;
  if (filters.from) query.from = startOfDay(filters.from).toISOString();
  if (filters.to) query.to = endOfDay(filters.to).toISOString();
  const caller = filters.callerNumber.trim();
  if (caller) query.callerNumber = caller;
  return query;
}

// Có bộ lọc mở rộng (khoảng thời gian, số người gọi) đang bật không.
export function hasAdvancedFilters(filters: HistoryFilters): boolean {
  return filters.from !== null || filters.to !== null || filters.callerNumber.trim() !== '';
}

export function hasAnyFilter(filters: HistoryFilters): boolean {
  return filters.quick !== 'ALL' || hasAdvancedFilters(filters);
}
