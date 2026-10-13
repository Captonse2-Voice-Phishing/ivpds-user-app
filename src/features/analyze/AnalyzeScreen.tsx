import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CANCELED, toApiError } from '../../api/errors';
import {
  Button,
  Card,
  DateTimeField,
  Notice,
  ProgressBar,
  Screen,
  Segmented,
  TextField,
} from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import type { MainTabScreenProps } from '../../navigation/types';
import { spacing, typography } from '../../theme';
import type { SelectedAudio } from '../../utils/audioFile';
import { FilePanel } from './FilePanel';
import { RecordPanel } from './RecordPanel';
import { useUploadCall } from './useUploadCall';

type Mode = 'record' | 'file';

const MODES = [
  { value: 'record', label: 'Ghi âm', icon: 'mic-outline' },
  { value: 'file', label: 'Chọn file', icon: 'folder-open-outline' },
] as const;

export function AnalyzeScreen({ navigation, route }: MainTabScreenProps<'Analyze'>) {
  // Trang chủ có thể mở thẳng một trong hai lựa chọn.
  const requestedMode = route.params?.mode;
  const [mode, setMode] = useState<Mode>(requestedMode ?? 'record');
  const [appliedRequest, setAppliedRequest] = useState(requestedMode);
  if (requestedMode !== appliedRequest) {
    setAppliedRequest(requestedMode);
    if (requestedMode) setMode(requestedMode);
  }

  // Giữ riêng bản ghi và file đã chọn để đổi qua lại không làm mất.
  const [recorded, setRecorded] = useState<SelectedAudio | null>(null);
  const [picked, setPicked] = useState<SelectedAudio | null>(null);
  const [recording, setRecording] = useState(false);
  // Tăng sau mỗi lần gửi xong để hai phần chọn âm thanh được tạo lại từ đầu.
  const [formVersion, setFormVersion] = useState(0);
  const [callerNumber, setCallerNumber] = useState('');
  const [calledAt, setCalledAt] = useState<Date | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { upload, isUploading, progress, cancel } = useUploadCall();
  const audio = mode === 'record' ? recorded : picked;

  const send = () => {
    if (!audio) return;
    setPhoneError(null);
    setFormError(null);
    upload(
      {
        file: { uri: audio.uri, name: audio.name, type: audio.mimeType },
        source: audio.source,
        callerNumber: callerNumber.trim() || undefined,
        calledAt: calledAt ?? undefined,
      },
      {
        onSuccess: (call) => {
          // Gửi xong: dọn form rồi sang thẳng màn hình Kết quả của cuộc gọi vừa tạo.
          setRecorded(null);
          setPicked(null);
          setFormVersion((version) => version + 1);
          setCallerNumber('');
          setCalledAt(null);
          navigation.navigate('CallResult', { callId: call.id });
        },
        // Lỗi thì giữ nguyên file đã chọn để thử lại.
        onError: (error) => {
          const apiError = toApiError(error);
          if (apiError.code === CANCELED) return;
          if (apiError.code === 'INVALID_PHONE_NUMBER') {
            setPhoneError(apiErrorMessage(apiError));
          } else {
            setFormError(apiErrorMessage(apiError));
          }
        },
      },
    );
  };

  return (
    <Screen>
      <Text style={typography.heading}>Kiểm tra một cuộc gọi</Text>

      <Segmented options={MODES} value={mode} onChange={setMode} disabled={recording || isUploading} />

      {mode === 'record' ? (
        <RecordPanel
          key={formVersion}
          value={recorded}
          onChange={setRecorded}
          onBusyChange={setRecording}
          disabled={isUploading}
        />
      ) : (
        <FilePanel key={formVersion} value={picked} onChange={setPicked} disabled={isUploading} />
      )}

      <Card>
        <Text style={typography.title}>Thông tin thêm</Text>
        <Text style={typography.small}>Không bắt buộc.</Text>
        <TextField
          label="Số điện thoại người gọi"
          value={callerNumber}
          onChangeText={setCallerNumber}
          error={phoneError}
          keyboardType="phone-pad"
          editable={!isUploading}
          maxLength={30}
        />
        <DateTimeField
          label="Thời điểm cuộc gọi"
          value={calledAt}
          onChange={setCalledAt}
          maximumDate={new Date()}
          disabled={isUploading}
        />
      </Card>

      {formError ? <Notice tone="danger" message={formError} /> : null}

      {isUploading ? (
        <Card>
          <View style={styles.progressHeader}>
            <Text style={typography.bodyStrong}>Đang tải lên…</Text>
            <Text style={typography.bodyStrong}>{Math.round(progress * 100)}%</Text>
          </View>
          <ProgressBar progress={progress} accessibilityLabel="Tiến độ tải lên" />
          <Button title="Hủy" variant="secondary" icon="close" onPress={cancel} />
        </Card>
      ) : (
        <Button title="Gửi phân tích" icon="cloud-upload-outline" onPress={send} disabled={!audio || recording} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
