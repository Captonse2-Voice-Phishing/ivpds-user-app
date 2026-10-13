import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { RiskLevel } from '../api/types';
import { RISK_LEVELS } from '../constants/risk';
import { radius, spacing, toneColors, type Tone } from '../theme';
import { Icon, type IconName } from './Icon';

interface TagProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
  // Hiện vòng quay thay cho biểu tượng (ví dụ "Đang phân tích").
  loading?: boolean;
}

export function Tag({ label, tone = 'neutral', icon, loading = false }: TagProps) {
  const palette = toneColors[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette.soft, borderColor: palette.solid }]}>
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : icon ? (
        <Icon name={icon} size={16} color={palette.text} />
      ) : null}
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

// Tag mức rủi ro: luôn có cả biểu tượng lẫn chữ, không chỉ dựa vào màu.
export function RiskTag({ level }: { level: RiskLevel }) {
  const info = RISK_LEVELS[level];
  return <Tag label={info.label} tone={info.tone} icon={info.icon} />;
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: { fontSize: 14, fontWeight: '600' },
});
