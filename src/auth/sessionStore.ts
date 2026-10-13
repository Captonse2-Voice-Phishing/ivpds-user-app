import { create } from 'zustand';

import type { UserSummary } from '../api/types';

// 'loading': đang khôi phục phiên lúc mở ứng dụng.
export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  // Access token chỉ giữ trong bộ nhớ, không ghi ra đĩa.
  accessToken: string | null;
  user: UserSummary | null;
  // Lời nhắn hiện trên màn hình Đăng nhập sau khi phiên kết thúc (ví dụ hết hạn).
  notice: string | null;
  // 'success' cho lời nhắn sau một việc người dùng chủ động làm (đổi mật khẩu).
  noticeTone: 'warning' | 'success';
  setSession: (accessToken: string, user: UserSummary) => void;
  clearSession: (notice?: string | null, tone?: 'warning' | 'success') => void;
  // Sau khi sửa hồ sơ: lời chào và trang Tài khoản dùng tên mới.
  updateUserName: (fullName: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,
  notice: null,
  noticeTone: 'warning',
  setSession: (accessToken, user) => set({ status: 'signedIn', accessToken, user, notice: null }),
  clearSession: (notice = null, tone = 'warning') =>
    set({ status: 'signedOut', accessToken: null, user: null, notice, noticeTone: tone }),
  updateUserName: (fullName) =>
    set((state) => (state.user ? { user: { ...state.user, fullName } } : {})),
}));
