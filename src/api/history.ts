import { apiClient } from './client';
import { API_PREFIX } from './config';
import type { HistoryItem, HistoryQuery, PageResponse } from './types';

export const HISTORY_PAGE_SIZE = 20;

// Lịch sử cuộc gọi, mới nhất trước. Trong danh sách, transcript và details luôn là null.
export async function getHistory(query: HistoryQuery = {}): Promise<PageResponse<HistoryItem>> {
  const response = await apiClient.get<PageResponse<HistoryItem>>(`${API_PREFIX}/history`, {
    params: query,
  });
  return response.data;
}
