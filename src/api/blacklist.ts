import { apiClient } from './client';
import { API_PREFIX } from './config';
import type { BlacklistLookup, BlacklistReport, PageResponse, SubmitReportRequest } from './types';

const BLACKLIST = `${API_PREFIX}/blacklist`;

export const REPORTS_PAGE_SIZE = 20;

// Tra cứu một số (mọi dạng); backend trả số đã chuẩn hóa.
export async function lookupNumber(phoneNumber: string): Promise<BlacklistLookup> {
  const response = await apiClient.get<BlacklistLookup>(`${BLACKLIST}/lookup`, {
    params: { phoneNumber },
  });
  return response.data;
}

// Báo cáo một số. Gửi callId (cuộc gọi của chính mình) thì backend tự lấy số người gọi.
export async function submitReport(body: SubmitReportRequest): Promise<BlacklistReport> {
  const response = await apiClient.post<BlacklistReport>(`${BLACKLIST}/reports`, body);
  return response.data;
}

export async function getMyReports(page: number): Promise<PageResponse<BlacklistReport>> {
  const response = await apiClient.get<PageResponse<BlacklistReport>>(`${BLACKLIST}/reports`, {
    params: { page, size: REPORTS_PAGE_SIZE },
  });
  return response.data;
}
