import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

// 'prompt': chưa hỏi hoặc còn hỏi lại được; 'blocked': phải vào Cài đặt mới bật được.
export type RecordingPermission = 'checking' | 'granted' | 'prompt' | 'blocked';

function toState(response: { granted: boolean; canAskAgain: boolean }): RecordingPermission {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'prompt' : 'blocked';
}

export function useRecordingPermission() {
  const [permission, setPermission] = useState<RecordingPermission>('checking');

  useEffect(() => {
    const refresh = () => {
      getRecordingPermissionsAsync()
        .then((response) => setPermission(toState(response)))
        .catch(() => setPermission('prompt'));
    };
    refresh();
    // Người dùng có thể vừa bật quyền trong Cài đặt rồi quay lại ứng dụng.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, []);

  const request = useCallback(async () => {
    try {
      setPermission(toState(await requestRecordingPermissionsAsync()));
    } catch {
      setPermission('blocked');
    }
  }, []);

  return { permission, request };
}
