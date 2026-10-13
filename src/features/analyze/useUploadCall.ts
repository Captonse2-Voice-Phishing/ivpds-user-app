import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { uploadCall, type UploadCallInput } from '../../api/calls';
import { queryKeys } from '../../api/queryKeys';

// Gửi một cuộc gọi, kèm tiến độ tải lên thật (0–1) và khả năng hủy.
export function useUploadCall() {
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (input: UploadCallInput) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      setProgress(0);
      return uploadCall(input, { signal: controller.signal, onProgress: setProgress });
    },
    // Có cuộc gọi mới: lịch sử phải tải lại.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.history.all }),
  });

  return {
    upload: mutation.mutate,
    isUploading: mutation.isPending,
    progress,
    cancel: () => controllerRef.current?.abort(),
    reset: mutation.reset,
  };
}
