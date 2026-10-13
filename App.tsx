import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { API_URL } from './src/api/config';
import { toApiError } from './src/api/errors';
import { queryClient } from './src/api/queryClient';
import { restoreSession } from './src/auth/bootstrap';
import { useSessionStore } from './src/auth/sessionStore';
import { ErrorState, Screen } from './src/components';
import { apiErrorMessage } from './src/constants/errors';
import { BootScreen } from './src/features/auth/BootScreen';
import { navigationRef } from './src/navigation/navigationRef';
import { navigationTheme } from './src/navigation/navigationTheme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PushBanner } from './src/push/PushBanner';
import { registerPushDevice, startPushListeners } from './src/push/pushNotifications';

function describeBootError(error: unknown): string {
  return apiErrorMessage(toApiError(error));
}

// Khôi phục phiên trước khi hiện giao diện; trong lúc đó là màn hình chờ.
function SessionGate() {
  const status = useSessionStore((state) => state.status);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    restoreSession().catch((error: unknown) => setBootError(describeBootError(error)));
  }, []);

  if (status === 'loading') {
    return (
      <BootScreen
        errorMessage={bootError}
        onRetry={() => {
          setBootError(null);
          restoreSession().catch((error: unknown) => setBootError(describeBootError(error)));
        }}
      />
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <RootNavigator />
      {status === 'signedIn' ? <PushSession /> : null}
    </NavigationContainer>
  );
}

// Chỉ tồn tại khi đã đăng nhập: đăng ký thiết bị nhận thông báo đẩy và lắng nghe thông báo.
function PushSession() {
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    void registerPushDevice({ askPermission: true });
    startPushListeners()
      .then((remove) => {
        if (cancelled) remove();
        else stop = remove;
      })
      // Thông báo đẩy hỏng thì ứng dụng vẫn phải chạy bình thường.
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return <PushBanner />;
}

export default function App() {
  // Ứng dụng trở lại tiền cảnh thì TanStack Query làm mới dữ liệu đã cũ.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {API_URL ? (
          <SessionGate />
        ) : (
          <Screen contentStyle={{ justifyContent: 'center' }}>
            <ErrorState message="Ứng dụng chưa được cấu hình địa chỉ máy chủ (EXPO_PUBLIC_API_URL trong file .env)." />
          </Screen>
        )}
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
