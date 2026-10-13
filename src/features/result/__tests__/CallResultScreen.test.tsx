import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import * as callsApi from '../../../api/calls';
import { ApiError } from '../../../api/errors';
import type { Analysis, HistoryItem } from '../../../api/types';
import type { RootStackScreenProps } from '../../../navigation/types';
import { CallResultScreen } from '../CallResultScreen';

// Các trạng thái mà backend thật không tạo ra được trong lúc phát triển (chưa phân tích,
// lỗi thử lại được, số trong danh sách đen...) được kiểm tra ở đây với API giả lập.
jest.mock('../../../api/calls', () => ({
  getHistoryItem: jest.fn(),
  getLatestAnalysis: jest.fn(),
  requestAnalysis: jest.fn(),
  deleteCall: jest.fn(),
  removeCachedCallAudio: jest.fn(),
  getCall: jest.fn(),
  downloadCallAudio: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Warning: 'warning', Success: 'success', Error: 'error' },
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('expo-network', () => ({ useNetworkState: () => ({ isConnected: true }) }));
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0, isLoaded: true }),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

const api = jest.mocked(callsApi);

const CALL_ID = '5d0c0000-0000-0000-0000-000000000001';

function historyItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
  return {
    callId: CALL_ID,
    callerNumber: '+84901234567',
    callerBlacklisted: false,
    calledAt: null,
    source: 'UPLOADED',
    createdAt: '2026-10-10T06:15:30Z',
    durationSeconds: 150.2,
    analysis: null,
    owner: null,
    ...overrides,
  };
}

function analysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    id: 'c7a20000-0000-0000-0000-000000000001',
    callId: CALL_ID,
    status: 'COMPLETED',
    errorCode: null,
    errorMessage: null,
    createdAt: '2026-10-10T06:15:30Z',
    startedAt: '2026-10-10T06:15:31Z',
    completedAt: '2026-10-10T06:16:02Z',
    transcript: 'a lô mình là bên bộ công an ạ',
    language: 'vi',
    riskScore: 97,
    riskLevel: 'HIGH',
    confidence: 0.98,
    indicators: ['LEGAL_THREAT', 'SECRECY_DEMAND'],
    details: {
      sttModel: 'phowhisper',
      modelProbability: 0.9999,
      nlpModelVersion: 'r6',
      rulesetVersion: '5',
      riskEngineVersion: '1',
    },
    ...overrides,
  };
}

function failed(errorCode: string): Analysis {
  return analysis({
    status: 'FAILED',
    errorCode,
    errorMessage: 'English detail that must never be shown',
    riskScore: null,
    riskLevel: null,
    confidence: null,
    indicators: null,
    transcript: null,
    details: null,
  });
}

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

let queryClient: QueryClient;
// Dừng mọi truy vấn đang hỏi lại định kỳ để Jest thoát được sau khi chạy xong.
afterEach(() => queryClient?.clear());

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const props = {
    navigation,
    route: { key: 'CallResult', name: 'CallResult', params: { callId: CALL_ID } },
  } as unknown as RootStackScreenProps<'CallResult'>;
  await render(
    <QueryClientProvider client={queryClient}>
      <CallResultScreen {...props} />
    </QueryClientProvider>,
  );
}

const RISK_LABELS = ['Nguy cơ cao', 'Đáng ngờ', 'Chưa thấy dấu hiệu'];

beforeEach(() => {
  jest.clearAllMocks();
  api.getHistoryItem.mockResolvedValue(historyItem());
  api.getLatestAnalysis.mockResolvedValue(analysis());
});

describe('Kết quả: hoàn tất', () => {
  it('mức HIGH: nhãn, điểm, lời khuyên, dấu hiệu kèm giải thích, transcript', async () => {
    await renderScreen();

    expect(await screen.findByText('Nguy cơ cao')).toBeTruthy();
    expect(screen.getByText('97')).toBeTruthy();
    expect(screen.getByText(/Không đọc mã OTP, mật khẩu và không chuyển tiền/)).toBeTruthy();
    expect(screen.getByText('Đe dọa pháp lý')).toBeTruthy();
    expect(screen.getByText('Người gọi yêu cầu bạn không nói với ai.')).toBeTruthy();
    expect(screen.getByText('a lô mình là bên bộ công an ạ')).toBeTruthy();
    expect(screen.getByText('+84901234567')).toBeTruthy();
    expect(screen.getByText('2 phút 30 giây')).toBeTruthy();
    expect(screen.getByText('Tải file lên')).toBeTruthy();
  });

  it('mức MEDIUM: nhãn "Đáng ngờ" và lời khuyên riêng', async () => {
    api.getLatestAnalysis.mockResolvedValue(analysis({ riskLevel: 'MEDIUM', riskScore: 45 }));
    await renderScreen();

    expect(await screen.findByText('Đáng ngờ')).toBeTruthy();
    expect(screen.getByText('45')).toBeTruthy();
    expect(screen.getByText(/Hãy kiểm tra lại qua kênh chính thức/)).toBeTruthy();
    expect(screen.queryByText('Nguy cơ cao')).toBeNull();
  });

  it('mức LOW không có dấu hiệu: không viết "an toàn", có câu không phát hiện dấu hiệu', async () => {
    api.getLatestAnalysis.mockResolvedValue(analysis({ riskLevel: 'LOW', riskScore: 3, indicators: [] }));
    await renderScreen();

    expect(await screen.findByText('Chưa thấy dấu hiệu')).toBeTruthy();
    expect(screen.getByText('Không phát hiện dấu hiệu cụ thể nào.')).toBeTruthy();
    expect(screen.queryByText(/an toàn/i)).toBeNull();
  });

  it('mức rủi ro lấy từ backend, không tự suy ra từ điểm', async () => {
    // Điểm 10 nhưng backend nói HIGH: phải hiện HIGH.
    api.getLatestAnalysis.mockResolvedValue(analysis({ riskLevel: 'HIGH', riskScore: 10 }));
    await renderScreen();

    expect(await screen.findByText('Nguy cơ cao')).toBeTruthy();
    expect(screen.queryByText('Chưa thấy dấu hiệu')).toBeNull();
  });

  it('mã dấu hiệu lạ: hiện nguyên mã, không lỗi', async () => {
    api.getLatestAnalysis.mockResolvedValue(analysis({ indicators: ['BRAND_NEW_SIGNAL'] }));
    await renderScreen();

    expect(await screen.findByText('BRAND_NEW_SIGNAL')).toBeTruthy();
  });

  it('số trong danh sách đen: có dải đỏ và ẩn nút báo cáo', async () => {
    api.getHistoryItem.mockResolvedValue(historyItem({ callerBlacklisted: true }));
    await renderScreen();

    expect(await screen.findByText('Số này nằm trong danh sách đen')).toBeTruthy();
    expect(screen.queryByText('Báo cáo số này')).toBeNull();
    expect(screen.getByText('Phân tích lại')).toBeTruthy();
  });

  it('không có số người gọi: hiện "Không rõ số" và ẩn nút báo cáo', async () => {
    api.getHistoryItem.mockResolvedValue(historyItem({ callerNumber: null }));
    await renderScreen();

    expect(await screen.findByText('Không rõ số')).toBeTruthy();
    expect(screen.queryByText('Báo cáo số này')).toBeNull();
  });

  it('có số và chưa bị chặn: nút báo cáo mở form với callId', async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByText('Báo cáo số này'));
    expect(navigation.navigate).toHaveBeenCalledWith('ReportNumber', {
      callId: CALL_ID,
      phoneNumber: '+84901234567',
    });
  });

  it('chi tiết kỹ thuật thu gọn mặc định, mở ra có đủ ba con số tách biệt', async () => {
    await renderScreen();
    await screen.findByText('Nguy cơ cao');

    expect(screen.queryByText('Độ chắc chắn của kết luận')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Chi tiết kỹ thuật'));
    expect(screen.getByText('Độ chắc chắn của kết luận')).toBeTruthy();
    expect(screen.getByText('98%')).toBeTruthy();
    expect(screen.getByText('Xác suất do model tính')).toBeTruthy();
    expect(screen.getByText('Xác suất của model chỉ là một thành phần của điểm rủi ro.')).toBeTruthy();
  });
});

describe('Kết quả: đang phân tích', () => {
  it('PENDING: "Đang chờ tới lượt", không có phần trăm, không có nút xóa', async () => {
    api.getLatestAnalysis.mockResolvedValue(
      analysis({ status: 'PENDING', riskScore: null, riskLevel: null, indicators: null, transcript: null }),
    );
    await renderScreen();

    expect(await screen.findByText('Đang phân tích cuộc gọi…')).toBeTruthy();
    expect(screen.getByText('Đang chờ tới lượt')).toBeTruthy();
    expect(screen.getByText(/chúng tôi sẽ thông báo khi có kết quả/)).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText('Xóa')).toBeNull();
    expect(screen.queryByText('Phân tích lại')).toBeNull();
  });

  it('PROCESSING rồi COMPLETED: tự hỏi lại, hiện kết quả và rung cảnh báo', async () => {
    api.getLatestAnalysis
      .mockResolvedValueOnce(
        analysis({ status: 'PROCESSING', riskScore: null, riskLevel: null, indicators: null, transcript: null }),
      )
      .mockResolvedValue(analysis());
    await renderScreen();

    expect(await screen.findByText('Đang nghe và đánh giá nội dung')).toBeTruthy();
    // Lần hỏi lại sau 3 giây trả về kết quả.
    expect(await screen.findByText('Nguy cơ cao', {}, { timeout: 8000 })).toBeTruthy();
    expect(api.getLatestAnalysis).toHaveBeenCalledTimes(2);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  }, 15000);

  it('mở một kết quả đã có sẵn thì không rung', async () => {
    await renderScreen();
    await screen.findByText('Nguy cơ cao');

    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});

describe('Kết quả: lỗi', () => {
  it('lỗi thử lại được: câu tiếng Việt, nút "Thử lại" gọi phân tích lại, không có điểm hay mức', async () => {
    api.getLatestAnalysis.mockResolvedValue(failed('STT_UNAVAILABLE'));
    api.requestAnalysis.mockResolvedValue(analysis({ status: 'PENDING', riskLevel: null, riskScore: null }));
    await renderScreen();

    expect(await screen.findByText('Không phân tích được')).toBeTruthy();
    expect(
      screen.getByText('Hệ thống phân tích đang bận hoặc tạm ngừng. Hãy thử lại sau ít phút.'),
    ).toBeTruthy();
    for (const label of RISK_LABELS) expect(screen.queryByText(label)).toBeNull();
    expect(screen.queryByText('/100')).toBeNull();
    expect(screen.queryByText(/English detail/)).toBeNull();

    await fireEvent.press(screen.getByText('Thử lại'));
    await waitFor(() => expect(api.requestAnalysis).toHaveBeenCalledWith(CALL_ID));
    expect(await screen.findByText('Đang chờ tới lượt')).toBeTruthy();
  });

  it.each([
    ['NO_SPEECH_DETECTED', 'Không nghe được lời nói nào trong ghi âm.'],
    ['INVALID_AUDIO', 'File ghi âm không đọc được. Hãy thử file khác.'],
    ['AUDIO_TOO_LONG', 'Ghi âm quá dài hoặc quá lớn.'],
    ['AUDIO_OBJECT_MISSING', 'Không còn file ghi âm của cuộc gọi này.'],
  ])('lỗi không thử lại được %s: không có nút "Thử lại", vẫn xóa được', async (code, message) => {
    api.getLatestAnalysis.mockResolvedValue(failed(code));
    await renderScreen();

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText('Thử lại')).toBeNull();
    expect(screen.getByText('Xóa')).toBeTruthy();
    expect(screen.getByText('Nghe lại ghi âm')).toBeTruthy();
  });

  it('mã lỗi lạ: câu chung và cho thử lại', async () => {
    api.getLatestAnalysis.mockResolvedValue(failed('SOMETHING_NEW'));
    await renderScreen();

    expect(await screen.findByText('Không phân tích được cuộc gọi này.')).toBeTruthy();
    expect(screen.getByText('Thử lại')).toBeTruthy();
  });
});

describe('Kết quả: chưa phân tích và không tìm thấy', () => {
  it('ANALYSIS_NOT_FOUND: nút "Phân tích ngay" bắt đầu phân tích', async () => {
    api.getLatestAnalysis.mockRejectedValue(new ApiError({ code: 'ANALYSIS_NOT_FOUND', status: 404 }));
    api.requestAnalysis.mockResolvedValue(analysis({ status: 'PENDING', riskLevel: null, riskScore: null }));
    await renderScreen();

    expect(await screen.findByText('Chưa phân tích')).toBeTruthy();
    for (const label of RISK_LABELS) expect(screen.queryByText(label)).toBeNull();

    await fireEvent.press(screen.getByText('Phân tích ngay'));
    await waitFor(() => expect(api.requestAnalysis).toHaveBeenCalledWith(CALL_ID));
    expect(await screen.findByText('Đang phân tích cuộc gọi…')).toBeTruthy();
  });

  it('CALL_NOT_FOUND: báo cuộc gọi có thể đã bị xóa, nút quay lại', async () => {
    api.getHistoryItem.mockRejectedValue(new ApiError({ code: 'CALL_NOT_FOUND', status: 404 }));
    await renderScreen();

    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    expect(await screen.findByText('Không tìm thấy cuộc gọi')).toBeTruthy();
    // Danh sách lịch sử được làm mới để bỏ dòng của cuộc gọi đã xóa.
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['history', 'list'] }));
    await fireEvent.press(screen.getByText('Quay lại'));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('mất mạng khi tải: câu tiếng Việt và nút "Thử lại" tải lại', async () => {
    api.getHistoryItem.mockRejectedValueOnce(new ApiError({ code: 'NETWORK_ERROR' }));
    await renderScreen();

    expect(await screen.findByText('Không kết nối được máy chủ. Hãy kiểm tra mạng.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Thử lại'));
    expect(await screen.findByText('Nguy cơ cao')).toBeTruthy();
  });
});

describe('Kết quả: phân tích lại và xóa', () => {
  it.each([
    ['ANALYSIS_IN_PROGRESS', 409, 'Cuộc gọi đang được phân tích. Hãy thử lại sau.'],
    ['CALL_HAS_NO_AUDIO', 409, 'Không còn file ghi âm của cuộc gọi này.'],
    ['ANALYSIS_QUEUE_FULL', 503, 'Đang có quá nhiều cuộc gọi chờ phân tích. Hãy thử lại sau.'],
  ])('phân tích lại gặp %s: báo câu tiếng Việt, kết quả cũ vẫn còn', async (code, status, message) => {
    api.requestAnalysis.mockRejectedValue(new ApiError({ code, status }));
    await renderScreen();

    await fireEvent.press(await screen.findByText('Phân tích lại'));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText('Nguy cơ cao')).toBeTruthy();
  });

  async function pressAlertButton(alertSpy: jest.SpyInstance, text: string) {
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await act(async () => {
      buttons.find((button) => button.text === text)?.onPress?.();
    });
  }

  it('xóa: phải xác nhận; "Hủy" thì không xóa', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen();

    await fireEvent.press(await screen.findByText('Xóa'));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(api.deleteCall).not.toHaveBeenCalled();
    await pressAlertButton(alertSpy, 'Hủy');
    expect(api.deleteCall).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('xóa: xác nhận thì gọi API, dọn file đã tải và quay lại', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    api.deleteCall.mockResolvedValue(undefined);
    await renderScreen();

    await fireEvent.press(await screen.findByText('Xóa'));
    await pressAlertButton(alertSpy, 'Xóa');

    await waitFor(() => expect(api.deleteCall).toHaveBeenCalledWith(CALL_ID));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(api.removeCachedCallAudio).toHaveBeenCalledWith(CALL_ID);
    alertSpy.mockRestore();
  });

  it('xóa khi đang phân tích ở nơi khác (ANALYSIS_IN_PROGRESS): báo lỗi, không quay lại', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    api.deleteCall.mockRejectedValue(new ApiError({ code: 'ANALYSIS_IN_PROGRESS', status: 409 }));
    await renderScreen();

    await fireEvent.press(await screen.findByText('Xóa'));
    await pressAlertButton(alertSpy, 'Xóa');

    expect(await screen.findByText('Cuộc gọi đang được phân tích. Hãy thử lại sau.')).toBeTruthy();
    expect(navigation.goBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
