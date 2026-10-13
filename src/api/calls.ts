import { Directory, File, Paths } from 'expo-file-system';

import { useSessionStore } from '../auth/sessionStore';
import { apiClient, refreshAccessToken } from './client';
import { API_PREFIX, API_URL } from './config';
import { ApiError, NETWORK_ERROR } from './errors';
import type { Analysis, Call, CallSource, HistoryItem } from './types';

// Tải file lớn qua mạng chậm cần lâu hơn nhiều so với request thường.
const UPLOAD_TIMEOUT_MS = 10 * 60_000;

export interface UploadCallInput {
  file: { uri: string; name: string; type: string };
  source: Extract<CallSource, 'RECORDED' | 'UPLOADED'>;
  callerNumber?: string;
  calledAt?: Date;
}

interface UploadCallOptions {
  signal?: AbortSignal;
  // Tỉ lệ đã tải lên, 0–1.
  onProgress?: (ratio: number) => void;
}

// Gửi một cuộc gọi. Backend tự bắt đầu phân tích sau khi nhận file.
export async function uploadCall(input: UploadCallInput, options: UploadCallOptions = {}): Promise<Call> {
  const form = new FormData();
  // React Native: phần file trong FormData là { uri, name, type }; `name` phải có đuôi đúng.
  form.append('audio', input.file as unknown as Blob);
  form.append('source', input.source);
  if (input.callerNumber) form.append('callerNumber', input.callerNumber);
  if (input.calledAt) form.append('calledAt', input.calledAt.toISOString());

  const response = await apiClient.post<Call>(`${API_PREFIX}/calls`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT_MS,
    signal: options.signal,
    onUploadProgress: (event) => {
      if (event.total) options.onProgress?.(event.loaded / event.total);
    },
  });
  return response.data;
}

// Thông tin một cuộc gọi kèm lần phân tích mới nhất (có đủ transcript và details).
export async function getHistoryItem(callId: string): Promise<HistoryItem> {
  const response = await apiClient.get<HistoryItem>(`${API_PREFIX}/history/${callId}`);
  return response.data;
}

// Lần phân tích mới nhất. 404 ANALYSIS_NOT_FOUND nếu cuộc gọi chưa được phân tích lần nào.
export async function getLatestAnalysis(callId: string): Promise<Analysis> {
  const response = await apiClient.get<Analysis>(`${API_PREFIX}/calls/${callId}/analyses/latest`);
  return response.data;
}

// Yêu cầu phân tích lại; trả về lần phân tích mới (đang chờ).
export async function requestAnalysis(callId: string): Promise<Analysis> {
  const response = await apiClient.post<Analysis>(`${API_PREFIX}/calls/${callId}/analyses`);
  return response.data;
}

// Xóa cuộc gọi cùng file ghi âm và kết quả.
export async function deleteCall(callId: string): Promise<void> {
  await apiClient.delete(`${API_PREFIX}/calls/${callId}`);
}

function audioCacheDirectory(): Directory {
  const directory = new Directory(Paths.cache, 'call-audio');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

async function downloadOnce(callId: string, target: File): Promise<void> {
  const token = useSessionStore.getState().accessToken;
  await File.downloadFileAsync(`${API_URL}${API_PREFIX}/calls/${callId}/audio`, target, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    idempotent: true,
  });
}

// Lỗi của downloadFileAsync chỉ mang mã HTTP trong câu thông báo.
function downloadErrorStatus(error: unknown): number | null {
  const match = error instanceof Error ? /\b([45]\d\d)\b/.exec(error.message) : null;
  return match ? Number(match[1]) : null;
}

// Tải file ghi âm (cần Bearer token) về thư mục cache để phát file cục bộ; trả đường dẫn.
// File đã tải rồi thì dùng lại.
export async function downloadCallAudio(callId: string, extension: string): Promise<string> {
  const target = new File(audioCacheDirectory(), `${callId}.${extension || 'audio'}`);
  if (target.exists && target.size > 0) return target.uri;

  try {
    await downloadOnce(callId, target);
  } catch (firstError) {
    let status = downloadErrorStatus(firstError);
    if (status === 401) {
      // Access token hết hạn: làm mới rồi tải lại một lần.
      await refreshAccessToken();
      try {
        await downloadOnce(callId, target);
        return target.uri;
      } catch (secondError) {
        status = downloadErrorStatus(secondError);
      }
    }
    if (status === 404) throw new ApiError({ code: 'AUDIO_OBJECT_MISSING', status });
    if (status === null) throw new ApiError({ code: NETWORK_ERROR });
    throw new ApiError({ code: 'AUDIO_DOWNLOAD_FAILED', status });
  }
  return target.uri;
}

// Xóa file ghi âm đã tải của một cuộc gọi (sau khi xóa cuộc gọi).
export function removeCachedCallAudio(callId: string): void {
  try {
    for (const entry of audioCacheDirectory().list()) {
      if (entry instanceof File && entry.name.startsWith(callId)) entry.delete();
    }
  } catch {
    // Dọn cache không được cũng không sao.
  }
}

// Một cuộc gọi kèm thông tin file ghi âm (tên gốc, dung lượng).
export async function getCall(callId: string): Promise<Call> {
  const response = await apiClient.get<Call>(`${API_PREFIX}/calls/${callId}`);
  return response.data;
}
