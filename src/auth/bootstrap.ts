import { refreshAccessToken } from '../api/client';
import { useSessionStore } from './sessionStore';
import { readRefreshToken } from './tokenStorage';

// Mở ứng dụng: có refresh token thì làm mới trước khi hiện giao diện.
// Ném lỗi khi không gọi được máy chủ (mất mạng) để màn hình chờ cho thử lại;
// khi backend từ chối token thì phiên đã được xóa và trạng thái là 'signedOut'.
export async function restoreSession(): Promise<void> {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    useSessionStore.getState().clearSession();
    return;
  }
  try {
    await refreshAccessToken();
  } catch (error) {
    if (useSessionStore.getState().status === 'loading') throw error;
  }
}
