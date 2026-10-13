import type { CallSource } from '../api/types';

export const CALL_SOURCE_LABELS: Record<CallSource, string> = {
  RECORDED: 'Ghi âm trong ứng dụng',
  UPLOADED: 'Tải file lên',
  LIVE: 'Cuộc gọi trực tiếp',
};

export const UNKNOWN_CALLER_LABEL = 'Không rõ số';
