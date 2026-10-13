import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as authApi from '../../../api/auth';
import { ApiError } from '../../../api/errors';
import type { AuthResponse } from '../../../api/types';
import * as session from '../../../auth/session';
import { useSessionStore } from '../../../auth/sessionStore';
import type { RootStackScreenProps } from '../../../navigation/types';
import { LoginScreen } from '../LoginScreen';

// Các trường hợp cần tài khoản quản trị hoặc sự cố máy chủ mới tạo ra được (tài khoản bị
// khóa, máy chủ lỗi) được kiểm tra ở đây với API giả lập.
jest.mock('../../../api/auth', () => ({ login: jest.fn() }));
jest.mock('../../../auth/session', () => ({ startSession: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-network', () => ({ useNetworkState: () => ({ isConnected: true }) }));
jest.mock('expo-audio', () => ({}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

const login = jest.mocked(authApi.login);
const startSession = jest.mocked(session.startSession);
const navigation = { navigate: jest.fn() };

let queryClient: QueryClient;
afterEach(() => queryClient?.clear());

async function renderLogin(notice?: string) {
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const props = {
    navigation,
    route: { key: 'Login', name: 'Login', params: notice ? { notice } : undefined },
  } as unknown as RootStackScreenProps<'Login'>;
  await render(
    <QueryClientProvider client={queryClient}>
      <LoginScreen {...props} />
    </QueryClientProvider>,
  );
}

async function submit(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
}

const AUTH: AuthResponse = {
  accessToken: 'access',
  refreshToken: 'refresh',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: { id: 'u1', email: 'an@example.com', fullName: 'Nguyễn Văn An', roles: ['USER'] },
};

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ status: 'signedOut', accessToken: null, user: null, notice: null });
});

describe('Đăng nhập', () => {
  it('bỏ trống: báo lỗi dưới từng ô và không gọi API', async () => {
    await renderLogin();
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(screen.getByText('Vui lòng nhập email')).toBeTruthy();
    expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it('email sai dạng: không gọi API', async () => {
    await renderLogin();
    await submit('khong-phai-email', 'MatKhau123');

    expect(screen.getByText('Email không hợp lệ')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it('thành công: gửi email đã bỏ khoảng trắng, mật khẩu giữ nguyên, rồi bắt đầu phiên', async () => {
    login.mockResolvedValue(AUTH);
    await renderLogin();
    await submit('  an@example.com ', ' mat khau co dau cach ');

    await waitFor(() => expect(startSession).toHaveBeenCalled());
    expect(login.mock.calls[0][0]).toEqual({ email: 'an@example.com', password: ' mat khau co dau cach ' });
    expect(startSession.mock.calls[0][0]).toEqual(AUTH);
  });

  it.each([
    ['INVALID_CREDENTIALS', 401, 'Email hoặc mật khẩu không đúng'],
    ['ACCOUNT_LOCKED', 403, 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'],
    ['NETWORK_ERROR', null, 'Không kết nối được máy chủ. Hãy kiểm tra mạng.'],
  ])('%s: hiện câu tiếng Việt, không bắt đầu phiên', async (code, status, message) => {
    login.mockRejectedValue(new ApiError({ code, status, message: 'English message' }));
    await renderLogin();
    await submit('an@example.com', 'MatKhau123');

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText('English message')).toBeNull();
    expect(startSession).not.toHaveBeenCalled();
  });

  it('INTERNAL_ERROR: câu chung kèm mã tra cứu', async () => {
    login.mockRejectedValue(new ApiError({ code: 'INTERNAL_ERROR', status: 500, requestId: 'req-42' }));
    await renderLogin();
    await submit('an@example.com', 'MatKhau123');

    expect(await screen.findByText('Hệ thống gặp lỗi. Hãy thử lại. Mã tra cứu: req-42')).toBeTruthy();
  });

  it('VALIDATION_FAILED từ backend: lỗi tiếng Việt dưới đúng ô', async () => {
    login.mockRejectedValue(
      new ApiError({
        code: 'VALIDATION_FAILED',
        status: 400,
        fieldErrors: [{ field: 'email', message: 'must be a well-formed email address' }],
      }),
    );
    await renderLogin();
    await submit('an@example.com', 'MatKhau123');

    expect(await screen.findByText('Email không hợp lệ')).toBeTruthy();
    expect(screen.queryByText(/well-formed/)).toBeNull();
  });

  it('lời nhắn sau khi đặt lại mật khẩu, và lời nhắn hết phiên', async () => {
    await renderLogin('Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.');
    expect(screen.getByText('Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.')).toBeTruthy();
  });

  it('lời nhắn hết phiên bị thay bằng lỗi đăng nhập mới nhất', async () => {
    useSessionStore.setState({ notice: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    login.mockRejectedValue(new ApiError({ code: 'INVALID_CREDENTIALS', status: 401 }));
    await renderLogin();
    expect(screen.getByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')).toBeTruthy();

    await submit('an@example.com', 'sai');
    expect(await screen.findByText('Email hoặc mật khẩu không đúng')).toBeTruthy();
    expect(screen.queryByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')).toBeNull();
  });

  it('các liên kết mở đúng màn hình', async () => {
    await renderLogin();
    await fireEvent.press(screen.getByText('Quên mật khẩu?'));
    await fireEvent.press(screen.getByText('Chưa có tài khoản? Đăng ký'));

    expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');
    expect(navigation.navigate).toHaveBeenCalledWith('Register');
  });
});
