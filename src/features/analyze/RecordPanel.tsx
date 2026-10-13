import { useFocusEffect } from '@react-navigation/native';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errors';
import { AudioPlayer, Button, Card, Icon, Notice, ProgressBar } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { colors, spacing, typography } from '../../theme';
import {
  meterLevel,
  recordingFileName,
  validateAudioFile,
  type SelectedAudio,
} from '../../utils/audioFile';
import { formatClock, formatDuration } from '../../utils/format';
import { useRecordingPermission } from './useRecordingPermission';

// AAC trong .m4a, một kênh 64 kbps: đủ rõ cho giọng nói, khoảng 0,5 MB mỗi phút.
const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
};

type Phase = 'idle' | 'recording' | 'paused' | 'review';

interface RecordPanelProps {
  // Bản ghi đã được chọn để gửi (null nếu chưa có).
  value: SelectedAudio | null;
  onChange: (audio: SelectedAudio | null) => void;
  // Báo cho màn hình cha biết đang ghi dở để khóa việc chuyển sang "Chọn file".
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}

export function RecordPanel({ value, onChange, onBusyChange, disabled = false }: RecordPanelProps) {
  const { permission, request } = useRecordingPermission();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [review, setReview] = useState<{ uri: string; durationSeconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changePhase = useCallback(
    (next: Phase) => {
      setPhase(next);
      onBusyChange(next === 'recording' || next === 'paused');
    },
    [onBusyChange],
  );

  // Rời màn hình khi đang ghi thì tạm dừng, không để ghi âm chạy ngầm ngoài ý muốn.
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          if (recorder.isRecording) {
            recorder.pause();
            changePhase('paused');
          }
        } catch {
          // Phần ghi âm đang bị gỡ khỏi màn hình: bộ ghi đã được giải phóng, không còn gì để dừng.
        }
      };
    }, [recorder, changePhase]),
  );

  const start = async () => {
    setError(null);
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      changePhase('recording');
    } catch {
      setError('Không bắt đầu ghi âm được. Hãy thử lại.');
    }
  };

  const pause = () => {
    recorder.pause();
    changePhase('paused');
  };

  const resume = () => {
    recorder.record();
    changePhase('recording');
  };

  const stop = async () => {
    const durationSeconds = recorderState.durationMillis / 1000;
    try {
      await recorder.stop();
      // Trả loa về chế độ phát để nghe lại.
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error('missing uri');
      setReview({ uri, durationSeconds });
      changePhase('review');
    } catch {
      setError('Không lưu được bản ghi. Hãy ghi lại.');
      changePhase('idle');
    }
  };

  const discard = () => {
    setReview(null);
    setError(null);
    onChange(null);
    changePhase('idle');
  };

  const accept = () => {
    if (!review) return;
    const name = recordingFileName();
    let size: number | null = null;
    try {
      size = new File(review.uri).size ?? null;
    } catch {
      size = null;
    }
    const problem = validateAudioFile({ name, size });
    if (problem) {
      setError(apiErrorMessage(new ApiError({ code: problem })));
      return;
    }
    onChange({
      uri: review.uri,
      name,
      mimeType: 'audio/mp4',
      size,
      source: 'RECORDED',
      durationSeconds: review.durationSeconds,
    });
  };

  if (permission === 'checking') {
    return (
      <Card style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  if (permission !== 'granted') {
    const blocked = permission === 'blocked';
    return (
      <Card>
        <View style={styles.center}>
          <Icon name="mic-off-outline" size={40} color={colors.primary} />
        </View>
        <Text style={typography.body}>
          Ứng dụng cần micro để ghi âm. Hãy bật loa ngoài của cuộc gọi để ghi được cả hai bên.
        </Text>
        {blocked ? (
          <>
            <Notice
              tone="warning"
              message="Bạn đã tắt quyền micro. Hãy mở Cài đặt, chọn Quyền, rồi cho phép Micro."
            />
            <Button title="Mở Cài đặt" icon="settings-outline" onPress={() => void Linking.openSettings()} />
            {/* Sau khi bật trong Cài đặt, hỏi lại quyền: đã bật thì vào thẳng phần ghi âm. */}
            <Button title="Tôi đã bật quyền, thử lại" variant="ghost" onPress={() => void request()} />
          </>
        ) : (
          <Button title="Cho phép dùng micro" icon="mic-outline" onPress={() => void request()} />
        )}
        <Text style={typography.small}>Bạn vẫn có thể dùng mục “Chọn file” mà không cần micro.</Text>
      </Card>
    );
  }

  // Đã chọn bản ghi để gửi.
  if (value) {
    return (
      <Card>
        <View style={styles.selectedHeader}>
          <Icon name="checkmark-circle" size={24} color={colors.success} />
          <Text style={styles.selectedTitle}>Bản ghi âm đã chọn</Text>
        </View>
        <Text style={typography.small}>Thời lượng: {formatDuration(value.durationSeconds)}</Text>
        <AudioPlayer key={value.uri} uri={value.uri} knownDurationSeconds={value.durationSeconds} />
        <Button title="Ghi lại" variant="secondary" icon="refresh" onPress={discard} disabled={disabled} />
      </Card>
    );
  }

  if (phase === 'review' && review) {
    return (
      <Card>
        <Text style={typography.bodyStrong}>Nghe lại bản ghi</Text>
        <AudioPlayer key={review.uri} uri={review.uri} knownDurationSeconds={review.durationSeconds} />
        {error ? <Notice tone="danger" message={error} /> : null}
        <View style={styles.buttonRow}>
          <Button title="Ghi lại" variant="secondary" icon="refresh" onPress={discard} style={styles.flex} />
          <Button title="Dùng bản ghi này" icon="checkmark" onPress={accept} style={styles.flex} />
        </View>
      </Card>
    );
  }

  const active = phase === 'recording' || phase === 'paused';
  const level = phase === 'recording' ? meterLevel(recorderState.metering) : 0;
  return (
    <Card>
      <View style={styles.center}>
        <Text style={styles.clock} accessibilityLabel={`Đã ghi ${formatDuration(recorderState.durationMillis / 1000)}`}>
          {formatClock(active ? recorderState.durationMillis / 1000 : 0)}
        </Text>
        <Text style={typography.small}>
          {phase === 'recording' ? 'Đang ghi âm…' : phase === 'paused' ? 'Đang tạm dừng' : 'Bấm nút để bắt đầu ghi'}
        </Text>
      </View>

      <ProgressBar progress={level} color={colors.danger} height={10} accessibilityLabel="Mức âm lượng micro" />

      <View style={styles.center}>
        {active ? (
          <View style={styles.controls}>
            <Button
              title={phase === 'recording' ? 'Tạm dừng' : 'Tiếp tục'}
              variant="secondary"
              icon={phase === 'recording' ? 'pause' : 'play'}
              onPress={phase === 'recording' ? pause : resume}
              style={styles.flex}
            />
            <Button title="Dừng" icon="stop" onPress={() => void stop()} style={styles.flex} />
          </View>
        ) : (
          <Pressable
            onPress={() => void start()}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu ghi âm"
            style={({ pressed }) => [styles.recordButton, pressed && styles.recordButtonPressed]}
          >
            <Icon name="mic" size={44} color={colors.textOnPrimary} />
          </Pressable>
        )}
      </View>

      {error ? <Notice tone="danger" message={error} /> : null}
      <Text style={styles.footnote}>Ứng dụng không thể tự ghi âm cuộc gọi của điện thoại.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  clock: { fontSize: 48, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  recordButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonPressed: { backgroundColor: colors.dangerText },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selectedTitle: { ...typography.bodyStrong, flex: 1 },
  footnote: { ...typography.small, textAlign: 'center' },
});
