import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import * as notificationsApi from '../../api/notifications';
import { navigationRef } from '../../navigation/navigationRef';
import { usePushBannerStore } from '../pushBannerStore';
import { parsePushPayload } from '../pushData';
import {
  openPush,
  pushUnavailableReason,
  registerPushDevice,
  startPushListeners,
  unregisterPushDevice,
} from '../pushNotifications';

// Thông báo đẩy không chạy được trong Expo Go trên Android và cần projectId của EAS,
// nên toàn bộ luồng được kiểm tra ở đây với module giả lập.
jest.mock('expo-constants', () => ({
  __esModule: true,
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
  default: { executionEnvironment: 'standalone', expoConfig: { extra: { eas: { projectId: 'project-1' } } }, easConfig: null },
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  addPushTokenListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(),
}));
jest.mock('../../api/notifications', () => ({
  registerDevice: jest.fn(() => Promise.resolve()),
  unregisterDevice: jest.fn(() => Promise.resolve()),
  markNotificationRead: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../api/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn(() => Promise.resolve()) } }));
jest.mock('../../auth/session', () => ({ registerLogoutTask: jest.fn() }));
jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(() => true), navigate: jest.fn() },
}));

const N = jest.mocked(Notifications);
const api = jest.mocked(notificationsApi);
const nav = jest.mocked(navigationRef);
const constants = Constants as unknown as { executionEnvironment: string; expoConfig: unknown };

const TOKEN = 'ExponentPushToken[abc123]';
const PAYLOAD = { notificationId: 'n1', type: 'HIGH_RISK_CALL', callId: 'c1', analysisId: 'a1' };

beforeEach(async () => {
  jest.clearAllMocks();
  await unregisterPushDevice(); // xóa token còn nhớ từ test trước
  jest.clearAllMocks();
  constants.executionEnvironment = 'standalone';
  constants.expoConfig = { extra: { eas: { projectId: 'project-1' } } };
  Platform.OS = 'android';
  N.getPermissionsAsync.mockResolvedValue({ granted: true } as never);
  N.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
  N.getExpoPushTokenAsync.mockResolvedValue({ data: TOKEN } as never);
  N.getLastNotificationResponseAsync.mockResolvedValue(null);
  for (const add of [N.addNotificationReceivedListener, N.addNotificationResponseReceivedListener, N.addPushTokenListener]) {
    add.mockReturnValue({ remove: jest.fn() } as never);
  }
  nav.isReady.mockReturnValue(true);
  usePushBannerStore.getState().hide();
  AppState.currentState = 'active';
});

describe('parsePushPayload', () => {
  it('đọc đúng dữ liệu backend gửi kèm', () => {
    expect(parsePushPayload(PAYLOAD)).toEqual(PAYLOAD);
  });

  it('callId thiếu hoặc null (cuộc gọi đã xóa) thành null', () => {
    expect(parsePushPayload({ notificationId: 'n1', type: 'SUSPICIOUS_CALL', callId: null })?.callId).toBeNull();
    expect(parsePushPayload({ notificationId: 'n1' })).toEqual({
      notificationId: 'n1',
      type: 'UNKNOWN',
      callId: null,
      analysisId: null,
    });
  });

  it('không phải thông báo của IVPDS thì trả null', () => {
    for (const data of [null, undefined, 'x', 42, {}, { callId: 'c1' }, { notificationId: '' }, { notificationId: 7 }]) {
      expect(parsePushPayload(data)).toBeNull();
    }
  });
});

describe('pushUnavailableReason', () => {
  it('bản dựng riêng có projectId: dùng được', () => {
    expect(pushUnavailableReason()).toBeNull();
  });

  it('Expo Go: không dùng được', () => {
    constants.executionEnvironment = 'storeClient';
    expect(pushUnavailableReason()).toBe('EXPO_GO');
  });

  it('thiếu projectId của EAS: không dùng được', () => {
    constants.expoConfig = { extra: {} };
    expect(pushUnavailableReason()).toBe('NO_PROJECT_ID');
  });
});

describe('registerPushDevice', () => {
  it('Expo Go: bỏ qua hẳn, không đụng tới module thông báo hay backend', async () => {
    constants.executionEnvironment = 'storeClient';
    await expect(registerPushDevice({ askPermission: true })).resolves.toBe('unsupported');
    expect(N.getPermissionsAsync).not.toHaveBeenCalled();
    expect(api.registerDevice).not.toHaveBeenCalled();
  });

  it('đã có quyền: tạo kênh Android trước, lấy token theo projectId, đăng ký với backend', async () => {
    await expect(registerPushDevice({ askPermission: true })).resolves.toBe('registered');

    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith('call-alerts', expect.objectContaining({ importance: 4 }));
    // Kênh phải có trước khi hỏi quyền và lấy token.
    expect(N.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      N.getPermissionsAsync.mock.invocationCallOrder[0],
    );
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(N.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'project-1' });
    expect(api.registerDevice).toHaveBeenCalledWith(TOKEN, 'ANDROID');
  });

  it('iOS gửi platform IOS và không tạo kênh', async () => {
    Platform.OS = 'ios';
    await registerPushDevice({ askPermission: true });
    expect(N.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(api.registerDevice).toHaveBeenCalledWith(TOKEN, 'IOS');
  });

  it('chưa có quyền: hỏi; người dùng đồng ý thì đăng ký', async () => {
    N.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await expect(registerPushDevice({ askPermission: true })).resolves.toBe('registered');
    expect(N.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('người dùng từ chối: không lấy token, không gọi backend', async () => {
    N.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    N.requestPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await expect(registerPushDevice({ askPermission: true })).resolves.toBe('denied');
    expect(N.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(api.registerDevice).not.toHaveBeenCalled();
  });

  it('askPermission=false (token đổi): không bật hộp xin quyền', async () => {
    N.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await expect(registerPushDevice({ askPermission: false })).resolves.toBe('denied');
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('không lấy được token hoặc backend lỗi: trả "error", không ném lỗi ra ứng dụng', async () => {
    N.getExpoPushTokenAsync.mockRejectedValueOnce(new Error('no play services'));
    await expect(registerPushDevice({ askPermission: true })).resolves.toBe('error');

    api.registerDevice.mockRejectedValueOnce(new Error('400'));
    await expect(registerPushDevice({ askPermission: true })).resolves.toBe('error');
  });
});

describe('unregisterPushDevice (trước khi đăng xuất)', () => {
  it('gỡ đúng token đã đăng ký, chỉ một lần', async () => {
    await registerPushDevice({ askPermission: true });
    await unregisterPushDevice();
    await unregisterPushDevice();
    expect(api.unregisterDevice).toHaveBeenCalledTimes(1);
    expect(api.unregisterDevice).toHaveBeenCalledWith(TOKEN);
  });

  it('chưa từng đăng ký thì không gọi backend', async () => {
    await unregisterPushDevice();
    expect(api.unregisterDevice).not.toHaveBeenCalled();
  });

  it('backend lỗi cũng không chặn đăng xuất', async () => {
    await registerPushDevice({ askPermission: true });
    api.unregisterDevice.mockRejectedValueOnce(new Error('network'));
    await expect(unregisterPushDevice()).resolves.toBeUndefined();
  });
});

describe('openPush', () => {
  it('có callId: đánh dấu đã đọc và mở Kết quả của cuộc gọi', () => {
    openPush(PAYLOAD);
    expect(api.markNotificationRead).toHaveBeenCalledWith('n1');
    expect(nav.navigate).toHaveBeenCalledWith('CallResult', { callId: 'c1' });
  });

  it('cuộc gọi đã bị xóa (callId null): đánh dấu đã đọc và mở danh sách thông báo', () => {
    openPush({ ...PAYLOAD, callId: null });
    expect(api.markNotificationRead).toHaveBeenCalledWith('n1');
    expect(nav.navigate).toHaveBeenCalledWith('Notifications');
  });

  it('dữ liệu không hợp lệ: không làm gì', () => {
    openPush(null);
    expect(api.markNotificationRead).not.toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('điều hướng chưa sẵn sàng: vẫn đánh dấu đã đọc, không điều hướng', () => {
    nav.isReady.mockReturnValue(false);
    openPush(PAYLOAD);
    expect(api.markNotificationRead).toHaveBeenCalledWith('n1');
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('đánh dấu đã đọc lỗi cũng không chặn việc mở kết quả', async () => {
    api.markNotificationRead.mockRejectedValueOnce(new Error('404'));
    openPush(PAYLOAD);
    await Promise.resolve();
    expect(nav.navigate).toHaveBeenCalledWith('CallResult', { callId: 'c1' });
  });
});

describe('startPushListeners', () => {
  function content(data: unknown, identifier = 'req-1') {
    return { request: { identifier, content: { title: 'Cuộc gọi có nguy cơ lừa đảo cao', body: 'Cuộc gọi từ số +84901234567…', data } } };
  }

  it('Expo Go: không gắn bộ lắng nghe nào', async () => {
    constants.executionEnvironment = 'storeClient';
    const stop = await startPushListeners();
    stop();
    expect(N.addNotificationReceivedListener).not.toHaveBeenCalled();
  });

  it('thông báo đến khi ứng dụng đang mở: ẩn hẳn thông báo hệ thống, hiện dải trong ứng dụng', async () => {
    AppState.currentState = 'active';
    await startPushListeners();

    // Tắt cả shouldShowList: trên Android thông báo đã vào danh sách thì cũng bật lên đè lên dải.
    const handler = N.setNotificationHandler.mock.calls[0][0];
    await expect(handler?.handleNotification(content(PAYLOAD) as never)).resolves.toMatchObject({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
    });

    const onReceived = N.addNotificationReceivedListener.mock.calls[0][0];
    onReceived(content(PAYLOAD) as never);
    expect(usePushBannerStore.getState().banner).toEqual({
      title: 'Cuộc gọi có nguy cơ lừa đảo cao',
      body: 'Cuộc gọi từ số +84901234567…',
      payload: PAYLOAD,
    });
  });

  it('thông báo đến khi ứng dụng ở nền: hiện thông báo hệ thống, không để lại dải trong ứng dụng', async () => {
    AppState.currentState = 'background';
    await startPushListeners();

    const handler = N.setNotificationHandler.mock.calls[0][0];
    await expect(handler?.handleNotification(content(PAYLOAD) as never)).resolves.toMatchObject({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
    });

    N.addNotificationReceivedListener.mock.calls[0][0](content(PAYLOAD) as never);
    expect(usePushBannerStore.getState().banner).toBeNull();
  });

  it('bấm vào thông báo: mở kết quả, đánh dấu đã đọc; cùng một lần bấm không xử lý hai lần', async () => {
    await startPushListeners();
    const onResponse = N.addNotificationResponseReceivedListener.mock.calls[0][0];

    onResponse({ notification: content(PAYLOAD, 'req-7') } as never);
    onResponse({ notification: content(PAYLOAD, 'req-7') } as never);

    expect(nav.navigate).toHaveBeenCalledTimes(1);
    expect(nav.navigate).toHaveBeenCalledWith('CallResult', { callId: 'c1' });
    expect(api.markNotificationRead).toHaveBeenCalledTimes(1);
  });

  it('ứng dụng được mở từ một thông báo khi đang tắt', async () => {
    N.getLastNotificationResponseAsync.mockResolvedValue({
      notification: content({ ...PAYLOAD, callId: 'c9' }, 'req-launch'),
    } as never);
    await startPushListeners();
    expect(nav.navigate).toHaveBeenCalledWith('CallResult', { callId: 'c9' });
  });

  it('token đổi: đăng ký lại với backend mà không hỏi quyền', async () => {
    await startPushListeners();
    N.getPermissionsAsync.mockResolvedValue({ granted: false } as never);
    N.addPushTokenListener.mock.calls[0][0]({} as never);
    await Promise.resolve();
    await Promise.resolve();
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('hàm trả về gỡ hết các bộ lắng nghe', async () => {
    const stop = await startPushListeners();
    stop();
    for (const add of [N.addNotificationReceivedListener, N.addNotificationResponseReceivedListener, N.addPushTokenListener]) {
      expect(add.mock.results[0].value.remove).toHaveBeenCalledTimes(1);
    }
  });
});
