import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { formatClock } from '../utils/format';
import { IconButton } from './IconButton';
import { ProgressBar } from './ProgressBar';

interface AudioPlayerProps {
  // Đường dẫn file cục bộ.
  uri: string;
  // Thời lượng đã biết trước (giây), dùng khi trình phát chưa đọc xong file.
  knownDurationSeconds?: number | null;
}

// Trình nghe lại: phát/dừng, thanh tiến độ, thời lượng.
// Bọc ngoài bằng key={uri} để đổi file là tạo trình phát mới.
export function AudioPlayer({ uri, knownDurationSeconds }: AudioPlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const duration = status.duration > 0 ? status.duration : (knownDurationSeconds ?? 0);
  const position = Math.min(status.currentTime, duration || status.currentTime);

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // Đã phát hết thì phải tua về đầu mới phát lại được.
    if (duration > 0 && status.currentTime >= duration - 0.05) {
      void player.seekTo(0);
    }
    player.play();
  };

  return (
    <View style={styles.row}>
      <IconButton
        icon={status.playing ? 'pause' : 'play'}
        accessibilityLabel={status.playing ? 'Tạm dừng' : 'Phát'}
        onPress={toggle}
        disabled={!status.isLoaded}
      />
      <View style={styles.track}>
        <ProgressBar progress={duration > 0 ? position / duration : 0} accessibilityLabel="Tiến độ phát" />
      </View>
      <Text style={styles.time}>
        {formatClock(position)} / {formatClock(duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { flex: 1 },
  time: { ...typography.small, color: colors.text, fontVariant: ['tabular-nums'] },
});
