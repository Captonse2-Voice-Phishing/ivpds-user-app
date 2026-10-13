import { CANCELED, NETWORK_ERROR, type ApiError } from '../api/errors';
import { lookup } from '../utils/object';

export const SESSION_EXPIRED_NOTICE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

// Câu hiển thị cho các mã lỗi chung của API.
const API_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: SESSION_EXPIRED_NOTICE,
  INVALID_REFRESH_TOKEN: SESSION_EXPIRED_NOTICE,
  VALIDATION_FAILED: 'Vui lòng kiểm tra lại thông tin đã nhập.',
  MALFORMED_REQUEST: 'Yêu cầu không hợp lệ.',
  BAD_REQUEST: 'Yêu cầu không hợp lệ.',
  INVALID_PHONE_NUMBER: 'Số điện thoại không hợp lệ.',
  EMPTY_AUDIO: 'File ghi âm trống.',
  UNSUPPORTED_AUDIO_FORMAT:
    'Định dạng file không được hỗ trợ. Hãy dùng mp3, wav, m4a, aac, ogg, webm, 3gp, amr hoặc flac.',
  INVALID_AUDIO_CONTENT: 'File không phải là file ghi âm hợp lệ.',
  PAYLOAD_TOO_LARGE: 'File lớn hơn 50 MB.',
  STORAGE_UNAVAILABLE: 'Hệ thống lưu trữ đang tạm ngừng. Hãy thử lại sau.',
  ANALYSIS_IN_PROGRESS: 'Cuộc gọi đang được phân tích. Hãy thử lại sau.',
  CALL_NOT_FOUND: 'Không tìm thấy cuộc gọi (có thể đã bị xóa).',
  CALL_HAS_NO_AUDIO: 'Không còn file ghi âm của cuộc gọi này.',
  AUDIO_OBJECT_MISSING: 'Không còn file ghi âm của cuộc gọi này.',
  AUDIO_DOWNLOAD_FAILED: 'Không tải được file ghi âm. Hãy thử lại.',
  ANALYSIS_QUEUE_FULL: 'Đang có quá nhiều cuộc gọi chờ phân tích. Hãy thử lại sau.',
  [NETWORK_ERROR]: 'Không kết nối được máy chủ. Hãy kiểm tra mạng.',
  [CANCELED]: 'Đã hủy.',
};

export function internalErrorMessage(requestId: string | null): string {
  const base = 'Hệ thống gặp lỗi. Hãy thử lại.';
  return requestId ? `${base} Mã tra cứu: ${requestId}` : base;
}

// `overrides` cho phép từng màn hình đặt câu riêng cho một mã (ví dụ INVALID_CREDENTIALS).
// Không bao giờ trả về `message` tiếng Anh của backend.
export function apiErrorMessage(error: ApiError, overrides?: Record<string, string>): string {
  return (
    (overrides ? lookup(overrides, error.code) : undefined) ??
    lookup(API_ERROR_MESSAGES, error.code) ??
    internalErrorMessage(error.requestId)
  );
}

export interface AnalysisErrorInfo {
  message: string;
  retryable: boolean;
}

const BUSY: AnalysisErrorInfo = {
  message: 'Hệ thống phân tích đang bận hoặc tạm ngừng. Hãy thử lại sau ít phút.',
  retryable: true,
};
const UNREADABLE: AnalysisErrorInfo = {
  message: 'File ghi âm không đọc được. Hãy thử file khác.',
  retryable: false,
};
const TOO_BIG: AnalysisErrorInfo = { message: 'Ghi âm quá dài hoặc quá lớn.', retryable: false };
const NO_AUDIO: AnalysisErrorInfo = {
  message: 'Không còn file ghi âm của cuộc gọi này.',
  retryable: false,
};

// Câu hiển thị cho `errorCode` của một lần phân tích FAILED.
const ANALYSIS_ERRORS: Record<string, AnalysisErrorInfo> = {
  NO_SPEECH_DETECTED: { message: 'Không nghe được lời nói nào trong ghi âm.', retryable: false },
  INVALID_AUDIO: UNREADABLE,
  EMPTY_AUDIO: UNREADABLE,
  AUDIO_TOO_LONG: TOO_BIG,
  AUDIO_TOO_LARGE: TOO_BIG,
  PAYLOAD_TOO_LARGE: TOO_BIG,
  CALL_HAS_NO_AUDIO: NO_AUDIO,
  AUDIO_OBJECT_MISSING: NO_AUDIO,
  STT_UNAVAILABLE: BUSY,
  STT_FAILED: BUSY,
  NLP_MODEL_UNAVAILABLE: BUSY,
  AUDIO_PROCESSING_UNAVAILABLE: BUSY,
  AUDIO_PROCESSING_TIMEOUT: BUSY,
  AI_SERVICE_UNAVAILABLE: BUSY,
  AI_SERVICE_TIMEOUT: BUSY,
  AI_SERVICE_ERROR: BUSY,
  STORAGE_UNAVAILABLE: BUSY,
  ANALYSIS_QUEUE_FULL: {
    message: 'Đang có quá nhiều cuộc gọi chờ phân tích. Hãy thử lại sau.',
    retryable: true,
  },
  ANALYSIS_INTERRUPTED: {
    message: 'Quá trình phân tích bị gián đoạn. Hãy thử lại.',
    retryable: true,
  },
};

const UNKNOWN_ANALYSIS_ERROR: AnalysisErrorInfo = {
  message: 'Không phân tích được cuộc gọi này.',
  retryable: true,
};

export function analysisErrorInfo(errorCode: string | null): AnalysisErrorInfo {
  return (errorCode ? lookup(ANALYSIS_ERRORS, errorCode) : undefined) ?? UNKNOWN_ANALYSIS_ERROR;
}
