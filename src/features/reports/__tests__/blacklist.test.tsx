import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import * as blacklistApi from '../../../api/blacklist';
import { ApiError } from '../../../api/errors';
import type { BlacklistReport, PageResponse } from '../../../api/types';
import type { MainTabScreenProps, RootStackScreenProps } from '../../../navigation/types';
import { LookupScreen } from '../../lookup/LookupScreen';
import { MyReportsScreen } from '../MyReportsScreen';
import { ReportNumberScreen } from '../ReportNumberScreen';

// Số đã bị chặn và giới hạn 20 báo cáo chờ duyệt cần quản trị viên mới tạo ra được,
// nên được kiểm tra ở đây với API giả lập.
jest.mock('../../../api/blacklist', () => ({
  lookupNumber: jest.fn(),
  submitReport: jest.fn(),
  getMyReports: jest.fn(),
}));

const api = jest.mocked(blacklistApi);
const navigation = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };

let queryClient: QueryClient;
afterEach(() => queryClient?.clear());
beforeEach(() => jest.clearAllMocks());

async function renderWithClient(element: ReactElement) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  await render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

function renderLookup(phoneNumber?: string) {
  const props = {
    navigation,
    route: { key: 'Lookup', name: 'Lookup', params: phoneNumber ? { phoneNumber } : undefined },
  } as unknown as MainTabScreenProps<'Lookup'>;
  return renderWithClient(<LookupScreen {...props} />);
}

function renderReport(params?: { phoneNumber?: string; callId?: string }) {
  const props = {
    navigation,
    route: { key: 'ReportNumber', name: 'ReportNumber', params },
  } as unknown as RootStackScreenProps<'ReportNumber'>;
  return renderWithClient(<ReportNumberScreen {...props} />);
}

function report(overrides: Partial<BlacklistReport> = {}): BlacklistReport {
  return {
    id: 'r1',
    phoneNumber: '+84901234567',
    callId: null,
    reason: 'Tự xưng công an',
    status: 'PENDING',
    createdAt: new Date(2026, 9, 10, 13, 20).toISOString(),
    reviewedAt: null,
    ...overrides,
  };
}

describe('Tra cứu số điện thoại', () => {
  it('bỏ trống: báo lỗi, không gọi API', async () => {
    await renderLookup();
    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }));

    expect(screen.getByText('Vui lòng nhập số điện thoại')).toBeTruthy();
    expect(api.lookupNumber).not.toHaveBeenCalled();
  });

  it('số bị chặn: thẻ đỏ có lý do và ngày, không có nút báo cáo', async () => {
    api.lookupNumber.mockResolvedValue({
      phoneNumber: '+84901234567',
      blacklisted: true,
      reason: 'Giả danh công an',
      since: new Date(2026, 9, 9, 9, 0).toISOString(),
    });
    await renderLookup();
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), ' 090 123 4567 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }));

    expect(await screen.findByText('Số này nằm trong danh sách đen')).toBeTruthy();
    expect(api.lookupNumber).toHaveBeenCalledWith('090 123 4567');
    expect(screen.getByText('+84901234567')).toBeTruthy();
    expect(screen.getByText('Lý do: Giả danh công an')).toBeTruthy();
    expect(screen.getByText('Từ ngày 09/10/2026')).toBeTruthy();
    expect(screen.queryByText('Báo cáo số này')).toBeNull();
  });

  it('số chưa bị chặn: thẻ xanh, nhắc "không có nghĩa là an toàn", nút báo cáo mang số đã chuẩn hóa', async () => {
    api.lookupNumber.mockResolvedValue({ phoneNumber: '+84987654321', blacklisted: false, reason: null, since: null });
    await renderLookup();
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), '0987654321');
    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }));

    expect(await screen.findByText('Chưa có trong danh sách đen')).toBeTruthy();
    expect(screen.getByText('Điều này không có nghĩa số này an toàn.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Báo cáo số này'));
    expect(navigation.navigate).toHaveBeenCalledWith('ReportNumber', { phoneNumber: '+84987654321' });
  });

  it('INVALID_PHONE_NUMBER: lỗi hiện dưới ô nhập, không có thẻ kết quả', async () => {
    api.lookupNumber.mockRejectedValue(new ApiError({ code: 'INVALID_PHONE_NUMBER', status: 400 }));
    await renderLookup();
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), 'abc');
    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }));

    expect(await screen.findByText('Số điện thoại không hợp lệ')).toBeTruthy();
    expect(screen.queryByText('Chưa có trong danh sách đen')).toBeNull();
    expect(screen.queryByText('Số này nằm trong danh sách đen')).toBeNull();
  });

  it('mất mạng: câu tiếng Việt và nút thử lại', async () => {
    api.lookupNumber.mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR' }));
    api.lookupNumber.mockResolvedValue({ phoneNumber: '+84987654321', blacklisted: false, reason: null, since: null });
    await renderLookup();
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại'), '0987654321');
    await fireEvent.press(screen.getByRole('button', { name: 'Tra cứu' }));

    expect(await screen.findByText('Không kết nối được máy chủ. Hãy kiểm tra mạng.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Thử lại'));
    expect(await screen.findByText('Chưa có trong danh sách đen')).toBeTruthy();
  });

  it('mở từ Trang chủ kèm số: điền sẵn và tra luôn', async () => {
    api.lookupNumber.mockResolvedValue({ phoneNumber: '+84987654321', blacklisted: false, reason: null, since: null });
    await renderLookup('0987654321');

    expect(await screen.findByText('Chưa có trong danh sách đen')).toBeTruthy();
    expect(api.lookupNumber).toHaveBeenCalledWith('0987654321');
    expect(screen.getByLabelText('Số điện thoại').props.value).toBe('0987654321');
  });

  it('liên kết "Báo cáo của tôi"', async () => {
    await renderLookup();
    await fireEvent.press(screen.getByText('Báo cáo của tôi'));
    expect(navigation.navigate).toHaveBeenCalledWith('MyReports');
  });
});

describe('Báo cáo số', () => {
  it('đi từ một cuộc gọi: số chỉ đọc, gửi callId (không gửi số)', async () => {
    api.submitReport.mockResolvedValue(report({ callId: 'call-1' }));
    await renderReport({ callId: 'call-1', phoneNumber: '+84901234567' });

    const phone = screen.getByLabelText('Số điện thoại');
    expect(phone.props.value).toBe('+84901234567');
    expect(phone.props.editable).toBe(false);

    await fireEvent.changeText(screen.getByLabelText('Lý do (không bắt buộc)'), '  Tự xưng công an  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    await waitFor(() => expect(api.submitReport).toHaveBeenCalled());
    expect(api.submitReport.mock.calls[0][0]).toEqual({ callId: 'call-1', reason: 'Tự xưng công an' });
    expect(await screen.findByText('Đã gửi báo cáo')).toBeTruthy();
  });

  it('đi từ Tra cứu: gửi số, không có lý do thì không gửi trường reason', async () => {
    api.submitReport.mockResolvedValue(report());
    await renderReport({ phoneNumber: '+84901234567' });
    expect(screen.getByLabelText('Số điện thoại').props.editable).not.toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Gửi báo cáo' }));
    await waitFor(() => expect(api.submitReport).toHaveBeenCalled());
    expect(api.submitReport.mock.calls[0][0]).toEqual({ phoneNumber: '+84901234567' });

    await fireEvent.press(await screen.findByText('Xem báo cáo của tôi'));
    expect(navigation.replace).toHaveBeenCalledWith('MyReports');
  });

  it('không nhập số: báo lỗi, không gọi API', async () => {
    await renderReport();
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(screen.getByText('Vui lòng nhập số điện thoại')).toBeTruthy();
    expect(api.submitReport).not.toHaveBeenCalled();
  });

  it('có dòng giải thích và bộ đếm ký tự của lý do', async () => {
    await renderReport({ phoneNumber: '0901234567' });
    expect(screen.getByText('Quản trị viên sẽ xem xét báo cáo trước khi chặn số.')).toBeTruthy();
    expect(screen.getByText('0/1000')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Lý do (không bắt buộc)'), 'abcde');
    expect(screen.getByText('5/1000')).toBeTruthy();
    expect(screen.getByLabelText('Lý do (không bắt buộc)').props.maxLength).toBe(1000);
  });

  it.each([
    ['NUMBER_ALREADY_REPORTED', 409, 'Bạn đã báo cáo số này rồi.'],
    ['PHONE_NUMBER_ALREADY_BLACKLISTED', 409, 'Số này đã nằm trong danh sách đen.'],
    ['TOO_MANY_PENDING_REPORTS', 429, 'Bạn đang có quá nhiều báo cáo chờ duyệt. Hãy thử lại sau.'],
    ['CALL_NOT_FOUND', 404, 'Không tìm thấy cuộc gọi (có thể đã bị xóa).'],
    ['NETWORK_ERROR', null, 'Không kết nối được máy chủ. Hãy kiểm tra mạng.'],
  ])('%s: câu tiếng Việt, vẫn ở form để sửa', async (code, status, message) => {
    api.submitReport.mockRejectedValue(new ApiError({ code, status, message: 'English message' }));
    await renderReport({ phoneNumber: '0901234567' });
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText('English message')).toBeNull();
    expect(screen.queryByText('Đã gửi báo cáo')).toBeNull();
  });

  it('INVALID_PHONE_NUMBER: dưới ô số khi tự nhập; thành câu riêng khi đi từ cuộc gọi không có số', async () => {
    api.submitReport.mockRejectedValue(new ApiError({ code: 'INVALID_PHONE_NUMBER', status: 400 }));
    await renderReport({ phoneNumber: 'abc' });
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi báo cáo' }));
    expect(await screen.findByText('Số điện thoại không hợp lệ')).toBeTruthy();
  });

  it('INVALID_PHONE_NUMBER khi đi từ cuộc gọi không có số người gọi', async () => {
    api.submitReport.mockRejectedValue(new ApiError({ code: 'INVALID_PHONE_NUMBER', status: 400 }));
    await renderReport({ callId: 'call-1' });
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi báo cáo' }));
    expect(await screen.findByText('Cuộc gọi này không có số người gọi để báo cáo.')).toBeTruthy();
  });
});

describe('Báo cáo của tôi', () => {
  function page(items: BlacklistReport[]): PageResponse<BlacklistReport> {
    return { items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
  }

  function renderMyReports() {
    const props = {
      navigation,
      route: { key: 'MyReports', name: 'MyReports' },
    } as unknown as RootStackScreenProps<'MyReports'>;
    return renderWithClient(<MyReportsScreen {...props} />);
  }

  it('ba trạng thái có nhãn riêng: Chờ duyệt, Đã chặn, Không được duyệt', async () => {
    api.getMyReports.mockResolvedValue(
      page([
        report({ id: 'r1', phoneNumber: '+84900000001', status: 'PENDING' }),
        report({ id: 'r2', phoneNumber: '+84900000002', status: 'APPROVED', reason: null }),
        report({ id: 'r3', phoneNumber: '+84900000003', status: 'REJECTED' }),
      ]),
    );
    await renderMyReports();

    expect(await screen.findByText('+84900000001')).toBeTruthy();
    expect(screen.getByText('Chờ duyệt')).toBeTruthy();
    expect(screen.getByText('Đã chặn')).toBeTruthy();
    expect(screen.getByText('Không được duyệt')).toBeTruthy();
    expect(screen.getAllByText('Báo cáo lúc 10/10/2026 13:20')).toHaveLength(3);
    // Hai báo cáo có lý do, một không.
    expect(screen.getAllByText('Tự xưng công an')).toHaveLength(2);
  });

  it('chưa có báo cáo: trạng thái rỗng', async () => {
    api.getMyReports.mockResolvedValue(page([]));
    await renderMyReports();

    expect(await screen.findByText('Bạn chưa báo cáo số nào')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tra cứu một số'));
    expect(navigation.navigate).toHaveBeenCalledWith('Main', { screen: 'Lookup' });
  });

  it('lỗi tải: câu tiếng Việt và thử lại', async () => {
    api.getMyReports.mockRejectedValueOnce(new ApiError({ code: 'INTERNAL_ERROR', status: 500, requestId: 'req-7' }));
    api.getMyReports.mockResolvedValue(page([report()]));
    await renderMyReports();

    expect(await screen.findByText('Hệ thống gặp lỗi. Hãy thử lại. Mã tra cứu: req-7')).toBeTruthy();
    await fireEvent.press(screen.getByText('Thử lại'));
    expect(await screen.findByText('+84901234567')).toBeTruthy();
  });
});
