import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';

import * as callsApi from '../../../api/calls';
import { ApiError } from '../../../api/errors';
import type { Call } from '../../../api/types';
import type { MainTabScreenProps } from '../../../navigation/types';
import { AnalyzeScreen } from '../AnalyzeScreen';

// Lỗi từ máy chủ khi tải lên (file quá lớn, nội dung không phải âm thanh, kho lưu trữ
// tạm ngừng...) được kiểm tra ở đây với API giả lập.
jest.mock('../../../api/calls', () => ({ uploadCall: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-network', () => ({ useNetworkState: () => ({ isConnected: true }) }));
jest.mock('expo-file-system', () => ({ File: jest.fn(() => ({ size: 1000 })) }));
jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  getRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, canAskAgain: true })),
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, canAskAgain: false })),
  useAudioRecorder: () => ({ isRecording: false, uri: null }),
  useAudioRecorderState: () => ({ durationMillis: 0, isRecording: false }),
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 13, isLoaded: true }),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

const uploadCall = jest.mocked(callsApi.uploadCall);
const getDocumentAsync = jest.mocked(DocumentPicker.getDocumentAsync);
const navigation = { navigate: jest.fn() };

let queryClient: QueryClient;
afterEach(() => queryClient?.clear());

async function renderAnalyze(mode: 'record' | 'file' = 'file') {
  queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const props = {
    navigation,
    route: { key: 'Analyze', name: 'Analyze', params: { mode } },
  } as unknown as MainTabScreenProps<'Analyze'>;
  await render(
    <QueryClientProvider client={queryClient}>
      <AnalyzeScreen {...props} />
    </QueryClientProvider>,
  );
}

function pickerReturns(name: string, size: number | undefined, mimeType = 'audio/mpeg') {
  getDocumentAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: `file:///cache/${name}`, name, size, mimeType, lastModified: 0 }],
  });
}

async function pickFile() {
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn file ghi âm' }));
}

const CREATED: Call = {
  id: 'call-1',
  callerNumber: null,
  calledAt: null,
  source: 'UPLOADED',
  createdAt: '2026-10-10T06:15:30Z',
  audio: null,
};

beforeEach(() => jest.clearAllMocks());

describe('Chọn file', () => {
  it('chưa chọn file thì không gửi được', async () => {
    await renderAnalyze();
    expect(screen.getByRole('button', { name: 'Gửi phân tích' }).props.accessibilityState.disabled).toBe(true);
  });

  it.each([
    ['video.mp4', 1000, 'Định dạng file không được hỗ trợ. Hãy dùng mp3, wav, m4a, aac, ogg, webm, 3gp, amr hoặc flac.'],
    ['qua-lon.mp3', 50 * 1024 * 1024 + 1, 'File lớn hơn 50 MB.'],
    ['rong.wav', 0, 'File ghi âm trống.'],
  ])('%s: báo ngay, không chọn và không gửi', async (name, size, message) => {
    pickerReturns(name, size);
    await renderAnalyze();
    await pickFile();

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText(name)).toBeNull();
    expect(uploadCall).not.toHaveBeenCalled();
  });

  it('file hợp lệ: hiện tên, dung lượng, nút bỏ chọn', async () => {
    pickerReturns('cuoc-goi.mp3', 1245678);
    await renderAnalyze();
    await pickFile();

    expect(await screen.findByText('cuoc-goi.mp3')).toBeTruthy();
    expect(screen.getByText('1,2 MB')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Bỏ chọn file'));
    expect(screen.queryByText('cuoc-goi.mp3')).toBeNull();
  });

  it('người dùng đóng bộ chọn: không có gì thay đổi, không báo lỗi', async () => {
    getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
    await renderAnalyze();
    await pickFile();

    await waitFor(() => expect(getDocumentAsync).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Chọn file ghi âm' })).toBeTruthy();
    expect(uploadCall).not.toHaveBeenCalled();
  });
});

describe('Gửi phân tích', () => {
  it('gửi đúng file, nguồn UPLOADED, số người gọi; xong thì sang Kết quả', async () => {
    pickerReturns('cuoc-goi.mp3', 2000);
    uploadCall.mockResolvedValue(CREATED);
    await renderAnalyze();
    await pickFile();
    await screen.findByText('cuoc-goi.mp3');
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại người gọi'), ' 0901 234 567 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi phân tích' }));

    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('CallResult', { callId: 'call-1' }));
    expect(uploadCall.mock.calls[0][0]).toEqual({
      file: { uri: 'file:///cache/cuoc-goi.mp3', name: 'cuoc-goi.mp3', type: 'audio/mpeg' },
      source: 'UPLOADED',
      callerNumber: '0901 234 567',
      calledAt: undefined,
    });
    // Gửi xong form được dọn sạch.
    expect(screen.queryByText('cuoc-goi.mp3')).toBeNull();
  });

  it('kiểu MIME chung chung của bộ chọn file được thay bằng kiểu suy từ đuôi', async () => {
    pickerReturns('ghi.m4a', 2000, 'application/octet-stream');
    uploadCall.mockResolvedValue(CREATED);
    await renderAnalyze();
    await pickFile();
    await screen.findByText('ghi.m4a');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi phân tích' }));

    await waitFor(() => expect(uploadCall).toHaveBeenCalled());
    expect(uploadCall.mock.calls[0][0].file.type).toBe('audio/mp4');
  });

  it.each([
    ['PAYLOAD_TOO_LARGE', 413, 'File lớn hơn 50 MB.'],
    ['UNSUPPORTED_AUDIO_FORMAT', 415, 'Định dạng file không được hỗ trợ. Hãy dùng mp3, wav, m4a, aac, ogg, webm, 3gp, amr hoặc flac.'],
    ['INVALID_AUDIO_CONTENT', 415, 'File không phải là file ghi âm hợp lệ.'],
    ['EMPTY_AUDIO', 400, 'File ghi âm trống.'],
    ['STORAGE_UNAVAILABLE', 503, 'Hệ thống lưu trữ đang tạm ngừng. Hãy thử lại sau.'],
    ['NETWORK_ERROR', null, 'Không kết nối được máy chủ. Hãy kiểm tra mạng.'],
  ])('máy chủ trả %s: câu tiếng Việt, giữ nguyên file để thử lại', async (code, status, message) => {
    pickerReturns('cuoc-goi.mp3', 2000);
    uploadCall.mockRejectedValue(new ApiError({ code, status, message: 'English message' }));
    await renderAnalyze();
    await pickFile();
    await screen.findByText('cuoc-goi.mp3');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi phân tích' }));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText('English message')).toBeNull();
    expect(screen.getByText('cuoc-goi.mp3')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('INVALID_PHONE_NUMBER: lỗi hiện dưới ô số điện thoại', async () => {
    pickerReturns('cuoc-goi.mp3', 2000);
    uploadCall.mockRejectedValue(new ApiError({ code: 'INVALID_PHONE_NUMBER', status: 400 }));
    await renderAnalyze();
    await pickFile();
    await screen.findByText('cuoc-goi.mp3');
    await fireEvent.changeText(screen.getByLabelText('Số điện thoại người gọi'), 'abc');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi phân tích' }));

    expect(await screen.findByText('Số điện thoại không hợp lệ.')).toBeTruthy();
    expect(screen.getByText('cuoc-goi.mp3')).toBeTruthy();
  });

  it('người dùng hủy tải lên: không báo lỗi, giữ nguyên file', async () => {
    pickerReturns('cuoc-goi.mp3', 2000);
    uploadCall.mockRejectedValue(new ApiError({ code: 'CANCELED' }));
    await renderAnalyze();
    await pickFile();
    await screen.findByText('cuoc-goi.mp3');
    await fireEvent.press(screen.getByRole('button', { name: 'Gửi phân tích' }));

    await waitFor(() => expect(uploadCall).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gửi phân tích' })).toBeTruthy());
    expect(screen.queryByText('Đã hủy.')).toBeNull();
    expect(screen.getByText('cuoc-goi.mp3')).toBeTruthy();
  });
});

describe('Ghi âm: quyền micro', () => {
  it('chưa có quyền: giải thích trước, bị từ chối hẳn thì hướng dẫn mở Cài đặt', async () => {
    await renderAnalyze('record');

    expect(
      await screen.findByText(
        'Ứng dụng cần micro để ghi âm. Hãy bật loa ngoài của cuộc gọi để ghi được cả hai bên.',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cho phép dùng micro' }));

    expect(await screen.findByText(/Bạn đã tắt quyền micro/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mở Cài đặt' })).toBeTruthy();
  });
});
