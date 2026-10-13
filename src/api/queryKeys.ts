import type { HistoryQuery } from './types';

// Khóa truy vấn của TanStack Query, gom một chỗ để làm mới đúng dữ liệu liên quan.
export const queryKeys = {
  history: {
    all: ['history'] as const,
    lists: ['history', 'list'] as const,
    list: (filters: HistoryQuery) => ['history', 'list', filters] as const,
    recent: ['history', 'recent'] as const,
    detail: (callId: string) => ['history', 'detail', callId] as const,
  },
  analysis: {
    latest: (callId: string) => ['analysis', 'latest', callId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
    list: ['notifications', 'list'] as const,
  },
  reports: { all: ['reports'] as const },
  blacklist: {
    lookup: (phoneNumber: string) => ['blacklist', 'lookup', phoneNumber] as const,
  },
  profile: ['profile'] as const,
};
