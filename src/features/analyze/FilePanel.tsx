import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/errors';
import { AudioPlayer, Button, Card, Icon, IconButton, Notice } from '../../components';
import { AUDIO_PICKER_TYPES } from '../../constants/audio';
import { apiErrorMessage } from '../../constants/errors';
import { colors, spacing, typography } from '../../theme';
import { audioMimeType, validateAudioFile, type SelectedAudio } from '../../utils/audioFile';
import { formatFileSize } from '../../utils/format';

interface FilePanelProps {
  value: SelectedAudio | null;
  onChange: (audio: SelectedAudio | null) => void;
  disabled?: boolean;
}

export function FilePanel({ value, onChange, disabled = false }: FilePanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const pick = async () => {
    setError(null);
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: AUDIO_PICKER_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const size = asset.size ?? null;
      // Kiểm tra đuôi và dung lượng ngay; sai thì báo luôn, không gửi.
      const problem = validateAudioFile({ name: asset.name, size });
      if (problem) {
        onChange(null);
        setError(apiErrorMessage(new ApiError({ code: problem })));
        return;
      }
      onChange({
        uri: asset.uri,
        name: asset.name,
        mimeType: audioMimeType(asset.name, asset.mimeType),
        size,
        source: 'UPLOADED',
        durationSeconds: null,
      });
    } catch {
      setError('Không mở được file. Hãy thử lại.');
    } finally {
      setPicking(false);
    }
  };

  if (value) {
    return (
      <Card>
        <View style={styles.fileRow}>
          <Icon name="musical-notes" size={28} color={colors.primary} />
          <View style={styles.fileText}>
            <Text style={typography.bodyStrong} numberOfLines={2}>
              {value.name}
            </Text>
            {value.size !== null ? <Text style={typography.small}>{formatFileSize(value.size)}</Text> : null}
          </View>
          <IconButton
            icon="close-circle"
            accessibilityLabel="Bỏ chọn file"
            onPress={() => onChange(null)}
            color={colors.textSecondary}
            disabled={disabled}
          />
        </View>
        <AudioPlayer key={value.uri} uri={value.uri} />
        <Button
          title="Chọn file khác"
          variant="secondary"
          icon="folder-open-outline"
          onPress={() => void pick()}
          loading={picking}
          disabled={disabled}
        />
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.center}>
        <Icon name="document-attach-outline" size={40} color={colors.primary} />
      </View>
      <Text style={typography.body}>Chọn một file ghi âm cuộc gọi có sẵn trong máy.</Text>
      {error ? <Notice tone="danger" message={error} /> : null}
      <Button
        title="Chọn file ghi âm"
        icon="folder-open-outline"
        onPress={() => void pick()}
        loading={picking}
        disabled={disabled}
      />
      <Text style={typography.small}>
        Hỗ trợ mp3, wav, m4a, aac, ogg, webm, 3gp, amr, flac. Tối đa 50 MB.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileText: { flex: 1, gap: spacing.xs },
});
