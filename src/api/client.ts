import { create } from 'axios';

import { refreshSession } from '../auth/session';
import { useSessionStore } from '../auth/sessionStore';
import { attachAuthRefresh } from './authRefresh';
import { API_URL, REQUEST_TIMEOUT_MS } from './config';

// Client cho các API cần đăng nhập. Mọi lỗi ra khỏi client đều là ApiError.
export const apiClient = create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

const { refresh } = attachAuthRefresh(apiClient, {
  getAccessToken: () => useSessionStore.getState().accessToken,
  refresh: refreshSession,
});

// Làm mới token, dùng chung một lần gọi với interceptor.
export const refreshAccessToken = refresh;
