import {
  ALLOWED_AUDIO_EXTENSIONS,
  AUDIO_MIME_BY_EXTENSION,
  MAX_AUDIO_BYTES,
} from '../constants/audio';
import { lookup } from './object';

// File ghi âm đã chọn (ghi trong ứng dụng hoặc chọn từ máy), sẵn sàng để gửi.
export interface SelectedAudio {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  source: 'RECORDED' | 'UPLOADED';
  durationSeconds: number | null;
}

// Bộ chọn file đôi khi trả kiểu chung chung; khi đó suy ra từ đuôi file.
export function audioMimeType(name: string, reported?: string | null): string {
  if (reported && reported !== 'application/octet-stream' && reported !== '*/*') return reported;
  return lookup(AUDIO_MIME_BY_EXTENSION, fileExtension(name)) ?? 'application/octet-stream';
}

// Tên file cho bản ghi trong ứng dụng, ví dụ ghi-am-20261010-131500.m4a.
export function recordingFileName(at: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  return `ghi-am-${date}-${time}.m4a`;
}

// Đổi mức âm lượng micro (dBFS, 0 là to nhất) thành tỉ lệ 0–1 để vẽ thanh âm lượng.
const METER_FLOOR_DB = -60;
export function meterLevel(decibels: number | null | undefined): number {
  if (decibels === null || decibels === undefined || !Number.isFinite(decibels)) return 0;
  return Math.min(1, Math.max(0, (decibels - METER_FLOOR_DB) / -METER_FLOOR_DB));
}

export type AudioFileProblem = 'UNSUPPORTED_AUDIO_FORMAT' | 'PAYLOAD_TOO_LARGE' | 'EMPTY_AUDIO';

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase();
}

// Kiểm tra ở máy trước khi gửi; trả null nếu hợp lệ. Mã trùng với mã lỗi của backend
// để dùng chung câu hiển thị. Dung lượng không rõ (null) thì để backend kiểm tra.
export function validateAudioFile(file: {
  name: string;
  size?: number | null;
}): AudioFileProblem | null {
  const extension = fileExtension(file.name);
  if (!(ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(extension)) {
    return 'UNSUPPORTED_AUDIO_FORMAT';
  }
  if (file.size === 0) return 'EMPTY_AUDIO';
  if (typeof file.size === 'number' && file.size > MAX_AUDIO_BYTES) return 'PAYLOAD_TOO_LARGE';
  return null;
}
