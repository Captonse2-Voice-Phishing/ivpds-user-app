import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import { ApiError } from '../../../api/errors';
import * as profileApi from '../../../api/profile';
import type { UserProfile } from '../../../api/types';
import * as session from '../../../auth/session';
import { useSessionStore } from '../../../auth/sessionStore';
import type { MainTabScreenProps, RootStackScreenProps } from '../../../navigation/types';
import * as push from '../../../push/pushNotifications';
import { AccountScreen } from '../AccountScreen';
import { ChangePasswordScreen } from '../ChangePasswordScreen';
import { EditProfileScreen } from '../EditProfileScreen';

jest.mock('../../../api/profile', () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
}));
jest.mock('../../../auth/session', () => ({ logout: jest.fn(() => Promise.resolve()) }));
jest.mock('../../../push/pushNotifications', () => ({
  getPushPermission: jest.fn(),
  registerPushDevice: jest.fn(),
}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));

const api = jest.mocked(profileApi);
const logout = jest.mocked(session.logout);
const pushApi = jest.mocked(push);
const navigation = { navigate: jest.fn(), goBack: jest.fn() };

const PROFILE: UserProfile = {
  id: 'u1',
  email: 'an@example.com',
  fullName: 'Nguyễn Văn An',
  phoneNumber: '+84901234567',
  status: 'ACTIVE',
  blacklistAlertEnabled: true,
  roles: ['USER'],
  createdAt: '2026-10-01T03:00:00Z',
};

let queryClient: QueryClient;
afterEach(() => queryClient?.clear());

beforeEach(() => {
  jest.clearAllMocks();
  api.getProfile.mockResolvedValue(PROFILE);
  pushApi.getPushPermission.mockResolvedValue('unsupported');
  useSessionStore.setState({
    status: 'signedIn',
    accessToken: 'token',
    user: { id: 'u1', email: 'an@example.com', fullName: 'Nguyễn Văn An', roles: ['USER'] },
  });
});

async function renderWithClient(element: ReactElement) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  await render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

function renderAccount() {
  const props = { navigation, route: { key: 'Account', name: 'Account' } } as unknown as MainTabScreenProps<'Account'>;
  return renderWithClient(<AccountScreen {...props} />);
}

async function pressAlertButton(alertSpy: jest.SpyInstance, text: string) {
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
  await act(async () => {
    buttons.find((button) => button.text === text)?.onPress?.();
  });
}

describe('Tài khoản', () => {
  it('đầu trang: chữ cái đầu của tên, họ tên, email, số điện thoại', async () => {
    await renderAccount();

    expect(await screen.findByText('+84901234567')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy(); // chữ đầu của tên "An", không phải của họ
    expect(screen.getByText('Nguyễn Văn An')).toBeTruthy();
    expect(screen.getByText('an@example.com')).toBeTruthy();
  });

  it('các dòng mở đúng màn hình', async () => {
    await renderAccount();
    await screen.findByText('+84901234567');

    await fireEvent.press(screen.getByLabelText('Sửa hồ sơ'));
    await fireEvent.press(screen.getByLabelText('Đổi mật khẩu'));
    await fireEvent.press(screen.getByLabelText('Báo cáo của tôi'));
    expect(navigation.navigate).toHaveBeenCalledWith('EditProfile');
    expect(navigation.navigate).toHaveBeenCalledWith('ChangePassword');
    expect(navigation.navigate).toHaveBeenCalledWith('MyReports');
  });

  it('"Giới thiệu" mở ra tên ứng dụng, phiên bản và lời nhắc kết quả có thể sai', async () => {
    await renderAccount();
    expect(screen.queryByText('Kết quả do hệ thống tự động đánh giá và có thể sai.')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Giới thiệu'));
    expect(screen.getByText('Phiên bản 1.0.0')).toBeTruthy();
    expect(screen.getByText('Kết quả do hệ thống tự động đánh giá và có thể sai.')).toBeTruthy();
  });

  it('công tắc cảnh báo danh sách đen: đổi ngay khi gạt và gửi đúng một trường', async () => {
    api.updateProfile.mockResolvedValue({ ...PROFILE, blacklistAlertEnabled: false });
    await renderAccount();
    const toggle = await screen.findByLabelText('Cảnh báo khi số gọi đến nằm trong danh sách đen');
    await waitFor(() => expect(toggle.props.value).toBe(true));

    await fireEvent(toggle, 'valueChange', false);

    await waitFor(() => expect(api.updateProfile.mock.calls[0][0]).toEqual({ blacklistAlertEnabled: false }));
    await waitFor(() =>
      expect(screen.getByLabelText('Cảnh báo khi số gọi đến nằm trong danh sách đen').props.value).toBe(false),
    );
  });

  it('công tắc cảnh báo: backend lỗi thì hoàn lại và báo lỗi', async () => {
    api.updateProfile.mockRejectedValue(new ApiError({ code: 'NETWORK_ERROR' }));
    await renderAccount();
    const toggle = await screen.findByLabelText('Cảnh báo khi số gọi đến nằm trong danh sách đen');
    await waitFor(() => expect(toggle.props.value).toBe(true));

    await fireEvent(toggle, 'valueChange', false);

    expect(await screen.findByText('Không kết nối được máy chủ. Hãy kiểm tra mạng.')).toBeTruthy();
    expect(screen.getByLabelText('Cảnh báo khi số gọi đến nằm trong danh sách đen').props.value).toBe(true);
  });

  it('thông báo đẩy không dùng được (Expo Go): công tắc bị khóa, có dòng giải thích', async () => {
    await renderAccount();

    expect(await screen.findByText('Thông báo đẩy chưa dùng được trên bản cài đặt này.')).toBeTruthy();
    const toggle = screen.getByLabelText('Thông báo đẩy');
    expect(toggle.props.value).toBe(false);
    expect(toggle.props.disabled).toBe(true);
  });

  it('công tắc thông báo đẩy phản ánh quyền của hệ điều hành; bật thì đăng ký thiết bị', async () => {
    pushApi.getPushPermission.mockResolvedValue('denied');
    pushApi.registerPushDevice.mockResolvedValue('registered');
    await renderAccount();
    const toggle = screen.getByLabelText('Thông báo đẩy');
    await waitFor(() => expect(screen.getByLabelText('Thông báo đẩy').props.disabled).toBe(false));
    expect(toggle.props.value).toBe(false);

    await fireEvent(screen.getByLabelText('Thông báo đẩy'), 'valueChange', true);

    expect(pushApi.registerPushDevice).toHaveBeenCalledWith({ askPermission: true });
    await waitFor(() => expect(screen.getByLabelText('Thông báo đẩy').props.value).toBe(true));
  });

  it('bật thông báo đẩy mà bị từ chối quyền: hướng dẫn mở Cài đặt, công tắc vẫn tắt', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    pushApi.getPushPermission.mockResolvedValue('denied');
    pushApi.registerPushDevice.mockResolvedValue('denied');
    await renderAccount();
    await waitFor(() => expect(screen.getByLabelText('Thông báo đẩy').props.disabled).toBe(false));

    await fireEvent(screen.getByLabelText('Thông báo đẩy'), 'valueChange', true);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Chưa bật được thông báo', expect.any(String), expect.any(Array)));
    expect(screen.getByLabelText('Thông báo đẩy').props.value).toBe(false);
    alertSpy.mockRestore();
  });

  it('đăng xuất phải xác nhận; "Hủy" thì không đăng xuất', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderAccount();

    await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(logout).not.toHaveBeenCalled();
    await pressAlertButton(alertSpy, 'Hủy');
    expect(logout).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
    await pressAlertButton(alertSpy, 'Đăng xuất');
    expect(logout).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});

describe('Sửa hồ sơ', () => {
  function renderEdit() {
    const props = { navigation, route: { key: 'EditProfile', name: 'EditProfile' } } as unknown as RootStackScreenProps<'EditProfile'>;
    return renderWithClient(<EditProfileScreen {...props} />);
  }

  it('điền sẵn hồ sơ thật; email chỉ đọc', async () => {
    await renderEdit();

    expect((await screen.findByLabelText('Họ tên')).props.value).toBe('Nguyễn Văn An');
    expect(screen.getByLabelText('Số điện thoại').props.value).toBe('+84901234567');
    expect(screen.getByLabelText('Email').props.editable).toBe(false);
  });

  it('chỉ gửi trường đã đổi; lưu xong cập nhật lời chào và quay lại', async () => {
    api.updateProfile.mockResolvedValue({ ...PROFILE, fullName: 'Nguyễn Văn Bình' });
    await renderEdit();
    await fireEvent.changeText(await screen.findByLabelText('Họ tên'), '  Nguyễn Văn Bình ');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(api.updateProfile.mock.calls[0][0]).toEqual({ fullName: 'Nguyễn Văn Bình' });
    expect(useSessionStore.getState().user?.fullName).toBe('Nguyễn Văn Bình');
  });

  it('xóa trắng số điện thoại thì gửi chuỗi rỗng để backend xóa số', async () => {
    api.updateProfile.mockResolvedValue({ ...PROFILE, phoneNumber: null });
    await renderEdit();
    await fireEvent.changeText(await screen.findByLabelText('Số điện thoại'), '  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalled());
    expect(api.updateProfile.mock.calls[0][0]).toEqual({ phoneNumber: '' });
  });

  it('không đổi gì: không gọi API, chỉ quay lại', async () => {
    await renderEdit();
    await fireEvent.press(await screen.findByRole('button', { name: 'Lưu' }));

    expect(api.updateProfile).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('họ tên trống: báo lỗi, không gọi API', async () => {
    await renderEdit();
    await fireEvent.changeText(await screen.findByLabelText('Họ tên'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.getByText('Vui lòng nhập họ tên')).toBeTruthy();
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  it('INVALID_PHONE_NUMBER: lỗi dưới ô số điện thoại, ở lại form', async () => {
    api.updateProfile.mockRejectedValue(new ApiError({ code: 'INVALID_PHONE_NUMBER', status: 400 }));
    await renderEdit();
    await fireEvent.changeText(await screen.findByLabelText('Số điện thoại'), 'abc');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Số điện thoại không hợp lệ')).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('không tải được hồ sơ: báo lỗi và cho thử lại, không dựng form rỗng', async () => {
    api.getProfile.mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR' }));
    await renderEdit();

    expect(await screen.findByText('Không kết nối được máy chủ. Hãy kiểm tra mạng.')).toBeTruthy();
    expect(screen.queryByLabelText('Họ tên')).toBeNull();
    await fireEvent.press(screen.getByText('Thử lại'));
    expect((await screen.findByLabelText('Họ tên')).props.value).toBe('Nguyễn Văn An');
  });
});

describe('Đổi mật khẩu', () => {
  function renderChange() {
    return renderWithClient(<ChangePasswordScreen />);
  }

  async function fill(current: string, next: string, confirm: string) {
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), current);
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), next);
    await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), confirm);
    await fireEvent.press(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
  }

  it('kiểm tra ở máy: bỏ trống, mật khẩu mới quá ngắn, nhập lại không khớp', async () => {
    await renderChange();
    await fill('', '123', '456');

    expect(screen.getByText('Vui lòng nhập mật khẩu hiện tại')).toBeTruthy();
    expect(screen.getByText('Mật khẩu cần 8–72 ký tự')).toBeTruthy();
    expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeTruthy();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it('thành công: đăng xuất ở máy kèm lời nhắn "Đã đổi mật khẩu, vui lòng đăng nhập lại"', async () => {
    api.changePassword.mockResolvedValue(undefined);
    await renderChange();
    await fill('MatKhauCu1', 'MatKhauMoi1', 'MatKhauMoi1');

    await waitFor(() => expect(logout).toHaveBeenCalledWith('Đã đổi mật khẩu, vui lòng đăng nhập lại'));
    expect(api.changePassword.mock.calls[0][0]).toEqual({ currentPassword: 'MatKhauCu1', newPassword: 'MatKhauMoi1' });
  });

  it('INVALID_CURRENT_PASSWORD: lỗi dưới ô đầu, không đăng xuất', async () => {
    api.changePassword.mockRejectedValue(new ApiError({ code: 'INVALID_CURRENT_PASSWORD', status: 400 }));
    await renderChange();
    await fill('sai-mat-khau', 'MatKhauMoi1', 'MatKhauMoi1');

    expect(await screen.findByText('Mật khẩu hiện tại không đúng')).toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
  });

  it('mất mạng: báo lỗi chung, không đăng xuất', async () => {
    api.changePassword.mockRejectedValue(new ApiError({ code: 'NETWORK_ERROR' }));
    await renderChange();
    await fill('MatKhauCu1', 'MatKhauMoi1', 'MatKhauMoi1');

    expect(await screen.findByText('Không kết nối được máy chủ. Hãy kiểm tra mạng.')).toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
  });
});
