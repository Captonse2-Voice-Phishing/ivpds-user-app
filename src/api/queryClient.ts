import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './errors';

// Chỉ thử lại khi mất mạng hoặc máy chủ lỗi; lỗi 4xx thử lại cũng vô ích.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!(error instanceof ApiError)) return false;
  return error.isNetworkError || (error.status !== null && error.status >= 500);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry, staleTime: 30_000 },
    mutations: { retry: false },
  },
});
