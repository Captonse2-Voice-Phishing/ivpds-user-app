import { useIsFocused } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import {
  deleteCall,
  getHistoryItem,
  getLatestAnalysis,
  removeCachedCallAudio,
  requestAnalysis,
} from '../../api/calls';
import { ApiError } from '../../api/errors';
import { queryKeys } from '../../api/queryKeys';
import type { AnalysisStatus } from '../../api/types';

const POLL_INTERVAL_MS = 3000;

export function isAnalysisRunning(status: AnalysisStatus | undefined): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}

// Dữ liệu và thao tác của màn hình Kết quả cho một cuộc gọi.
export function useCallResult(callId: string) {
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();

  // Thông tin cuộc gọi: số người gọi, thời lượng, có trong danh sách đen không.
  const call = useQuery({
    queryKey: queryKeys.history.detail(callId),
    queryFn: () => getHistoryItem(callId),
  });

  // Cuộc gọi đã bị xóa ở nơi khác: Lịch sử và Trang chủ phải bỏ dòng đó ngay.
  // (Chỉ làm mới các danh sách, không đụng tới truy vấn chi tiết đang báo lỗi này.)
  const callMissing = call.error instanceof ApiError && call.error.code === 'CALL_NOT_FOUND';
  useEffect(() => {
    if (!callMissing) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.history.lists });
    void queryClient.invalidateQueries({ queryKey: queryKeys.history.recent });
  }, [callMissing, queryClient]);

  // Trạng thái phân tích: hỏi lại mỗi 3 giây khi đang chờ/đang chạy, dừng khi có kết quả
  // hoặc khi rời màn hình.
  const analysis = useQuery({
    queryKey: queryKeys.analysis.latest(callId),
    queryFn: () => getLatestAnalysis(callId),
    refetchInterval: (query) =>
      isFocused && isAnalysisRunning(query.state.data?.status) ? POLL_INTERVAL_MS : false,
  });

  // Phân tích vừa xong: lịch sử và số thông báo chưa đọc đã thay đổi; rung nhẹ nếu có cảnh báo.
  const status = analysis.data?.status;
  const riskLevel = analysis.data?.riskLevel;
  const previousStatus = useRef(status);
  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = status;
    if (!isAnalysisRunning(before) || isAnalysisRunning(status) || !status) return;

    void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  }, [status, riskLevel, queryClient]);

  const reanalyze = useMutation({
    mutationFn: () => requestAnalysis(callId),
    onSuccess: (started) => {
      // Lần phân tích mới đang chờ: đưa vào cache để việc hỏi lại định kỳ bắt đầu ngay.
      queryClient.setQueryData(queryKeys.analysis.latest(callId), started);
      void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteCall(callId),
    onSuccess: () => removeCachedCallAudio(callId),
  });

  // Gọi sau khi đã rời màn hình: bỏ dữ liệu của cuộc gọi đã xóa và tải lại lịch sử.
  const forgetDeletedCall = () => {
    queryClient.removeQueries({ queryKey: queryKeys.history.detail(callId) });
    queryClient.removeQueries({ queryKey: queryKeys.analysis.latest(callId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };

  return { call, analysis, reanalyze, remove, forgetDeletedCall };
}
