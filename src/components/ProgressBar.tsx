import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

interface ProgressBarProps {
  // Tỉ lệ 0–1.
  progress: number;
  color?: string;
  height?: number;
  accessibilityLabel?: string;
}

export function ProgressBar({ progress, color = colors.primary, height = 8, accessibilityLabel }: ProgressBarProps) {
  const ratio = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return (
    <View
      style={[styles.track, { height }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
    >
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.border, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
