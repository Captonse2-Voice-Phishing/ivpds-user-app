import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '../../../api/errors';
import * as notificationsApi from '../../../api/notifications';
import type { AppNotification, PageResponse } from '../../../api/types';
import type { RootStackScreenProps } from '../../../navigation/types';
import { NotificationsScreen } from '../NotificationsScreen';

jest.mock('../../../api/notifications', () => ({
  getNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

const api = jest.mocked(notificationsApi);
const navigation = { navigate: jest.fn() };

let queryClient: QueryClient;
afterEach(() => queryClient?.clear());

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    type: 'HIGH_RISK_CALL',
    title: 'Cuộc gọi có nguy cơ lừa đảo cao',
    message: 'Cuộc gọi từ số +84901234567 được đánh giá mức nguy cơ cao với 97/100 điểm rủi ro.',
    read: false,
    readAt: null,
    analysisId: 'a1',
    callId: 'c1',
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...overrides,
  };
}

function page(items: AppNotification[]): PageResponse<AppNotification> {
  return { items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
}

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const props = {
    navigation,
    route: { key: 'Notifications', name: 'Notifications' },
  } as unknown as RootStackScreenProps<'Notifications'>;
  await render(
    <QueryClientProvider client={queryClient}>
      <NotificationsScreen {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  api.getUnreadCount.mockResolvedValue(2);
  api.markNotificationRead.mockImplementation((id) => Promise.resolve(notification({ id, read: true })));
  api.markAllNotificationsRead.mockResolvedValue(2);
});

describe('Thông báo', () => {
  it('hiện nguyên văn tiêu đề và nội dung của backend, kèm thời gian tương đối', async () => {
    api.getNotifications.mockResolvedValue(page([notification()]));
    await renderScreen();

    expect(await screen.findByText('Cuộc gọi có nguy cơ lừa đảo cao')).toBeTruthy();
    expect(
      screen.getByText('Cuộc gọi từ số +84901234567 được đánh giá mức nguy cơ cao với 97/100 điểm rủi ro.'),
    ).toBeTruthy();
    expect(screen.getByText('5 phút trước')).toBeTruthy();
    expect(screen.getByText('2 thông báo chưa đọc')).toBeTruthy();
  });

  it('ba loại thông báo và một loại lạ đều hiển thị được', async () => {
    api.getNotifications.mockResolvedValue(
      page([
        notification({ id: 'n1', type: 'HIGH_RISK_CALL', title: 'Cao' }),
        notification({ id: 'n2', type: 'SUSPICIOUS_CALL', title: 'Đáng ngờ' }),
        notification({ id: 'n3', type: 'BLACKLISTED_CALLER', title: 'Danh sách đen' }),
        notification({ id: 'n4', type: 'SOMETHING_NEW' as AppNotification['type'], title: 'Loại mới' }),
      ]),
    );
    await renderScreen();

    for (const title of ['Cao', 'Đáng ngờ', 'Danh sách đen', 'Loại mới']) {
      expect(await screen.findByText(title)).toBeTruthy();
    }
  });

  it('thông báo chưa đọc được đánh dấu cho trình đọc màn hình; đã đọc thì không', async () => {
    api.getNotifications.mockResolvedValue(
      page([notification({ id: 'n1', title: 'Chưa xem' }), notification({ id: 'n2', title: 'Đã xem', read: true })]),
    );
    await renderScreen();

    expect(await screen.findByLabelText(/^Chưa đọc\. Chưa xem\./)).toBeTruthy();
    expect(screen.getByLabelText(/^Đã xem\./)).toBeTruthy();
  });

  it('bấm thông báo chưa đọc có callId: đánh dấu đã đọc và mở Kết quả', async () => {
    api.getNotifications.mockResolvedValue(page([notification()]));
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(/^Chưa đọc\./));

    expect(navigation.navigate).toHaveBeenCalledWith('CallResult', { callId: 'c1' });
    await waitFor(() => expect(api.markNotificationRead).toHaveBeenCalledWith('n1', expect.anything()));
  });

  it('bấm thông báo đã đọc: mở Kết quả, không gọi đánh dấu lần nữa', async () => {
    api.getNotifications.mockResolvedValue(page([notification({ read: true })]));
    await renderScreen();

    await fireEvent.press(await screen.findByText('Cuộc gọi có nguy cơ lừa đảo cao'));

    expect(navigation.navigate).toHaveBeenCalledWith('CallResult', { callId: 'c1' });
    expect(api.markNotificationRead).not.toHaveBeenCalled();
  });

  it('cuộc gọi đã bị xóa (callId null): chỉ đánh dấu đã đọc và báo "Cuộc gọi này đã bị xóa"', async () => {
    api.getNotifications.mockResolvedValue(page([notification({ callId: null })]));
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(/^Chưa đọc\./));

    expect(await screen.findByText('Cuộc gọi này đã bị xóa')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
    await waitFor(() => expect(api.markNotificationRead).toHaveBeenCalledWith('n1', expect.anything()));
  });

  it('bấm xong thì dòng đó hết "chưa đọc" ngay và số chưa đọc giảm', async () => {
    api.getNotifications.mockResolvedValue(page([notification({ callId: null })]));
    // Giữ cho lần gọi máy chủ chưa xong để thấy thay đổi tức thì trên màn hình.
    api.markNotificationRead.mockReturnValue(new Promise(() => undefined));
    await renderScreen();
    await screen.findByText('2 thông báo chưa đọc');

    await fireEvent.press(screen.getByLabelText(/^Chưa đọc\./));

    await waitFor(() => expect(screen.queryByLabelText(/^Chưa đọc\./)).toBeNull());
    expect(screen.getByText('1 thông báo chưa đọc')).toBeTruthy();
  });

  it('"Đánh dấu đã đọc tất cả" gọi API và tải lại', async () => {
    api.getNotifications.mockResolvedValue(page([notification()]));
    await renderScreen();
    await screen.findByText('2 thông báo chưa đọc');
    api.getUnreadCount.mockResolvedValue(0);
    api.getNotifications.mockResolvedValue(page([notification({ read: true })]));

    await fireEvent.press(screen.getByRole('button', { name: 'Đánh dấu đã đọc tất cả' }));

    await waitFor(() => expect(api.markAllNotificationsRead).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Đã đọc hết')).toBeTruthy();
    expect(screen.queryByLabelText(/^Chưa đọc\./)).toBeNull();
  });

  it('không còn thông báo chưa đọc: nút "Đánh dấu đã đọc tất cả" bị khóa', async () => {
    api.getUnreadCount.mockResolvedValue(0);
    api.getNotifications.mockResolvedValue(page([notification({ read: true })]));
    await renderScreen();

    await screen.findByText('Đã đọc hết');
    expect(
      screen.getByRole('button', { name: 'Đánh dấu đã đọc tất cả' }).props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('chưa có thông báo: trạng thái rỗng', async () => {
    api.getUnreadCount.mockResolvedValue(0);
    api.getNotifications.mockResolvedValue(page([]));
    await renderScreen();

    expect(await screen.findByText('Chưa có thông báo nào')).toBeTruthy();
    expect(screen.queryByText('Đánh dấu đã đọc tất cả')).toBeNull();
  });

  it('lỗi tải: câu tiếng Việt và nút thử lại', async () => {
    api.getNotifications.mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR' }));
    api.getNotifications.mockResolvedValue(page([notification()]));
    await renderScreen();

    expect(await screen.findByText('Không kết nối được máy chủ. Hãy kiểm tra mạng.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Thử lại'));
    expect(await screen.findByText('Cuộc gọi có nguy cơ lừa đảo cao')).toBeTruthy();
  });
});
