import { useIsFocused } from '@react-navigation/native';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteCall, removeCachedCallAudio } from '../../api/calls';
import { getHistory, HISTORY_PAGE_SIZE } from '../../api/history';
import { queryKeys } from '../../api/queryKeys';
import type { HistoryItem, HistoryQuery, PageResponse } from '../../api/types';

const RUNNING_REFRESH_MS = 5000;

function hasRunningAnalysis(items: HistoryItem[]): boolean {
  return items.some(
    (item) => item.analysis?.status === 'PENDING' || item.analysis?.status === 'PROCESSING',
  );
}

// Danh sách lịch sử cuộn vô hạn, mỗi lần 20 dòng.
export function useHistoryList(query: HistoryQuery) {
  const isFocused = useIsFocused();
  return useInfiniteQuery({
    queryKey: queryKeys.history.list(query),
    queryFn: ({ pageParam }) => getHistory({ ...query, page: pageParam, size: HISTORY_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last: PageResponse<HistoryItem>) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
    // Còn cuộc gọi đang phân tích thì tự tải lại để dòng đó chuyển sang kết quả.
    refetchInterval: (state) =>
      isFocused && hasRunningAnalysis(state.state.data?.pages.flatMap((page) => page.items) ?? [])
        ? RUNNING_REFRESH_MS
        : false,
  });
}

const RECENT_COUNT = 3;

// Ba cuộc gọi mới nhất cho Trang chủ.
export function useRecentCalls() {
  const isFocused = useIsFocused();
  return useQuery({
    queryKey: queryKeys.history.recent,
    queryFn: () => getHistory({ page: 0, size: RECENT_COUNT }),
    refetchInterval: (state) =>
      isFocused && hasRunningAnalysis(state.state.data?.items ?? []) ? RUNNING_REFRESH_MS : false,
  });
}

export function useDeleteCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (callId: string) => deleteCall(callId),
    onSuccess: (_data, callId) => {
      removeCachedCallAudio(callId);
      queryClient.removeQueries({ queryKey: queryKeys.history.detail(callId) });
      queryClient.removeQueries({ queryKey: queryKeys.analysis.latest(callId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
