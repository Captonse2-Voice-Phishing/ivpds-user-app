/* eslint-env jest */
// Giả lập mặc định cho các module native mà hầu hết component nền đều kéo theo.
// Từng file test có thể tự jest.mock lại để thay bằng bản riêng.
jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  getRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, canAskAgain: true })),
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false, canAskAgain: false })),
  useAudioRecorder: () => ({ isRecording: false, uri: null }),
  useAudioRecorderState: () => ({ durationMillis: 0, isRecording: false }),
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0, isLoaded: true }),
}));

jest.mock('expo-network', () => ({ useNetworkState: () => ({ isConnected: true }) }));

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));
