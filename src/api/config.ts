// Địa chỉ gốc của backend, lấy từ .env; rỗng nghĩa là chưa cấu hình.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

export const API_PREFIX = '/api/v1';

export const REQUEST_TIMEOUT_MS = 20_000;
