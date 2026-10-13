import * as authApi from '../api/auth';
import { ApiError, toApiError } from '../api/errors';
import { queryClient } from '../api/queryClient';
import type { AuthResponse } from '../api/types';
import { SESSION_EXPIRED_NOTICE } from '../constants/errors';
import { useSessionStore } from './sessionStore';
import { clearRefreshToken, readRefreshToken, saveRefreshToken } from './tokenStorage';

// Bắt đầu phiên từ kết quả đăng nhập / đăng ký / refresh.
export async function startSession(auth: AuthResponse): Promise<void> {
  await saveRefreshToken(auth.refreshToken);
  useSessionStore.getState().setSession(auth.accessToken, auth.user);
}

// Kết thúc phiên ở máy: xóa token và toàn bộ dữ liệu server đã tải của người dùng này.
export async function endSession(
  notice: string | null = null,
  tone: 'warning' | 'success' = 'warning',
): Promise<void> {
  await clearRefreshToken();
  useSessionStore.getState().clearSession(notice, tone);
  queryClient.clear();
}

// Đổi refresh token lấy cặp token mới. KHÔNG gọi trực tiếp: đi qua `refreshAccessToken`
// của api/client để nhiều nơi cùng cần chỉ gây một lần gọi.
export async function refreshSession(): Promise<string> {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    await endSession(SESSION_EXPIRED_NOTICE);
    throw new ApiError({ code: 'INVALID_REFRESH_TOKEN', status: 401 });
  }
  try {
    const auth = await authApi.refresh(refreshToken);
    await startSession(auth);
    return auth.accessToken;
  } catch (error) {
    const apiError = toApiError(error);
    // Backend từ chối (token hết hạn, bị thu hồi, tài khoản bị khóa): về Đăng nhập.
    // Mất mạng hoặc máy chủ lỗi thì giữ token để thử lại sau.
    if (apiError.status !== null && apiError.status >= 400 && apiError.status < 500) {
      await endSession(SESSION_EXPIRED_NOTICE);
    }
    throw apiError;
  }
}

// Việc phải làm khi còn access token, trước khi đăng xuất (ví dụ gỡ token thông báo đẩy).
// Đăng ký qua hàm này để session.ts không phải nhập ngược các module gọi API.
const logoutTasks: (() => Promise<void>)[] = [];
export function registerLogoutTask(task: () => Promise<void>): void {
  logoutTasks.push(task);
}

// Đăng xuất đúng thứ tự: (1) gỡ token thông báo đẩy khi còn access token,
// (2) báo backend thu hồi refresh token, (3) xóa token và cache ở máy.
// `notice`: lời nhắn hiện ở màn hình Đăng nhập sau đó (ví dụ sau khi đổi mật khẩu).
export async function logout(notice: string | null = null): Promise<void> {
  for (const task of logoutTasks) {
    try {
      await task();
    } catch {
      // Một việc dọn dẹp lỗi không được chặn việc đăng xuất.
    }
  }
  const refreshToken = await readRefreshToken();
  if (refreshToken) {
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Không báo được backend (mất mạng) vẫn phải đăng xuất ở máy.
    }
  }
  await endSession(notice, notice ? 'success' : 'warning');
}
