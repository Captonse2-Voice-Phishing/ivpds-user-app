import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse } from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { markNotificationRead, registerDevice, unregisterDevice } from '../api/notifications';
import { queryClient } from '../api/queryClient';
import { queryKeys } from '../api/queryKeys';
import type { DevicePlatform } from '../api/types';
import { registerLogoutTask } from '../auth/session';
import { navigationRef } from '../navigation/navigationRef';
import { usePushBannerStore } from './pushBannerStore';
import { parsePushPayload, type PushPayload } from './pushData';

const ANDROID_CHANNEL_ID = 'call-alerts';

export type PushUnavailableReason = 'EXPO_GO' | 'SIMULATOR' | 'NO_PROJECT_ID' | 'WEB';
export type PushRegistration = 'registered' | 'unsupported' | 'denied' | 'error';

function projectId(): string | null {
  const fromConfig: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  return (typeof fromConfig === 'string' && fromConfig) || Constants.easConfig?.projectId || null;
}

// Vì sao thiết bị này không lấy được Expo push token (null nếu lấy được).
// Trong Expo Go trên Android, thông báo đẩy đã bị gỡ từ SDK 53: cần bản dựng riêng.
export function pushUnavailableReason(): PushUnavailableReason | null {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return 'WEB';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'EXPO_GO';
  if (Platform.OS === 'ios' && !Device.isDevice) return 'SIMULATOR';
  if (!projectId()) return 'NO_PROJECT_ID';
  return null;
}

// Chỉ nạp expo-notifications khi dùng được: trong Expo Go việc nạp module này tự báo lỗi.
// Dùng require thay cho import() vì Jest không chạy được import động.
function loadNotifications(): typeof import('expo-notifications') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

let registeredToken: string | null = null;

// Xin quyền (nếu được phép hỏi), lấy Expo push token và đăng ký với backend.
// Không lấy được token thì ứng dụng vẫn chạy bình thường, chỉ thiếu thông báo đẩy.
export async function registerPushDevice(options: { askPermission: boolean }): Promise<PushRegistration> {
  if (pushUnavailableReason()) return 'unsupported';
  try {
    const Notifications = loadNotifications();
    if (Platform.OS === 'android') {
      // Android 13+: hộp xin quyền chỉ hiện sau khi đã có ít nhất một kênh thông báo.
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Cảnh báo cuộc gọi',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && options.askPermission) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return 'denied';

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId() ?? undefined })).data;
    const platform: DevicePlatform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    await registerDevice(token, platform);
    registeredToken = token;
    return 'registered';
  } catch {
    return 'error';
  }
}

export type PushPermission = 'granted' | 'denied' | 'unsupported';

// Quyền thông báo của hệ điều hành, cho công tắc "Thông báo đẩy" ở trang Tài khoản.
export async function getPushPermission(): Promise<PushPermission> {
  if (pushUnavailableReason()) return 'unsupported';
  try {
    return (await loadNotifications().getPermissionsAsync()).granted ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

// Gỡ token khỏi backend; gọi khi còn access token, trước khi đăng xuất.
export async function unregisterPushDevice(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await unregisterDevice(token);
  } catch {
    // Không gỡ được (mất mạng) cũng không được chặn việc đăng xuất.
  }
}

registerLogoutTask(unregisterPushDevice);

function refreshNotificationQueries() {
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.history.all });
}

// Người dùng bấm vào một thông báo đẩy (hoặc dải trong ứng dụng): đánh dấu đã đọc
// và mở Kết quả của cuộc gọi; cuộc gọi đã bị xóa thì mở danh sách thông báo.
export function openPush(payload: PushPayload | null): void {
  if (!payload) return;
  markNotificationRead(payload.notificationId)
    .catch(() => undefined)
    .finally(refreshNotificationQueries);
  if (!navigationRef.isReady()) return;
  if (payload.callId) navigationRef.navigate('CallResult', { callId: payload.callId });
  else navigationRef.navigate('Notifications');
}

let lastHandledResponseId: string | null = null;

// Gắn các bộ lắng nghe thông báo đẩy cho phiên đang đăng nhập; trả hàm gỡ.
export async function startPushListeners(): Promise<() => void> {
  if (pushUnavailableReason()) return () => undefined;
  const Notifications = loadNotifications();

  // Bộ xử lý này được gọi cả khi ứng dụng ở nền (miễn là còn chạy), nên phải tự phân biệt:
  // - đang mở: ẩn hẳn thông báo hệ thống, thay bằng dải trong ứng dụng. Phải tắt cả
  //   shouldShowList, vì trên Android thông báo đã vào danh sách thì cũng bật lên đè lên dải;
  // - ở nền: hiện thông báo hệ thống như bình thường.
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const inBackground = AppState.currentState !== 'active';
      return {
        shouldShowBanner: inBackground,
        shouldShowList: inBackground,
        shouldPlaySound: inBackground,
        shouldSetBadge: false,
      };
    },
  });

  const received = Notifications.addNotificationReceivedListener((notification) => {
    refreshNotificationQueries();
    // Ở nền thì đã có thông báo hệ thống; không để lại dải cũ chờ người dùng quay lại.
    if (AppState.currentState !== 'active') return;
    const { title, body, data } = notification.request.content;
    usePushBannerStore.getState().show({
      title: title ?? 'Thông báo mới',
      body: body ?? '',
      payload: parsePushPayload(data),
    });
  });

  const handleResponse = (response: NotificationResponse) => {
    const id = response.notification.request.identifier;
    // Mỗi lần bấm chỉ xử lý một lần, kể cả khi bộ lắng nghe được gắn lại.
    if (id === lastHandledResponseId) return;
    lastHandledResponseId = id;
    openPush(parsePushPayload(response.notification.request.content.data));
  };
  const responded = Notifications.addNotificationResponseReceivedListener(handleResponse);
  // Token đổi (cài lại, khôi phục máy): đăng ký lại, không hỏi quyền lần nữa.
  const tokenChanged = Notifications.addPushTokenListener(() => {
    void registerPushDevice({ askPermission: false });
  });

  // Ứng dụng được mở bằng cách bấm vào một thông báo khi đang tắt.
  const launchResponse = await Notifications.getLastNotificationResponseAsync();
  if (launchResponse) handleResponse(launchResponse);

  return () => {
    received.remove();
    responded.remove();
    tokenChanged.remove();
  };
}
