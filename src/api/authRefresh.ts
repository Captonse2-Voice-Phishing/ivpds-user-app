import { isAxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { toApiError } from './errors';

interface AuthRefreshDeps {
  getAccessToken: () => string | null;
  // Gọi API refresh, lưu cặp token mới và trả access token mới; ném lỗi nếu thất bại.
  refresh: () => Promise<string>;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

function sentToken(config: InternalAxiosRequestConfig): string | null {
  const header = config.headers.get('Authorization');
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Gắn Bearer token vào mọi request; khi gặp 401 thì làm mới token rồi gửi lại đúng một lần.
// Nhiều request cùng 401 chỉ gây MỘT lần refresh — bắt buộc, vì refresh token dùng một lần
// và dùng lại token cũ làm backend thu hồi cả phiên.
export function attachAuthRefresh(instance: AxiosInstance, deps: AuthRefreshDeps) {
  let inFlight: Promise<string> | null = null;

  const refreshOnce = (): Promise<string> => {
    if (!inFlight) {
      inFlight = deps.refresh().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };

  instance.interceptors.request.use((config) => {
    const token = deps.getAccessToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const apiError = toApiError(error);
      const config: RetriableConfig | undefined = isAxiosError(error) ? error.config : undefined;
      if (apiError.status !== 401 || !config || config._retried) throw apiError;
      config._retried = true;

      const current = deps.getAccessToken();
      // Request này gửi đi bằng token cũ và trong lúc đó đã có token mới: chỉ cần gửi lại.
      if (!(current && sentToken(config) !== current)) {
        try {
          await refreshOnce();
        } catch (refreshError) {
          throw toApiError(refreshError);
        }
      }
      return instance.request(config);
    },
  );

  return { refresh: refreshOnce };
}
