import { create } from 'axios';

import { API_URL, REQUEST_TIMEOUT_MS } from './config';
import { toApiError } from './errors';

// Client cho các API công khai (đăng nhập, đăng ký, refresh...): không gắn token và
// không tự làm mới token — ở đây 401 nghĩa là sai thông tin, không phải hết phiên.
export const publicClient = create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

publicClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);
