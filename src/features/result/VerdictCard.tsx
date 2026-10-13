import { StyleSheet, Text, View } from 'react-native';

import type { RiskLevel } from '../../api/types';
import { Icon } from '../../components';
import { RISK_LEVELS } from '../../constants/risk';
import { cardShadow, colors, radius, spacing, toneColors, typography } from '../../theme';

interface VerdictCardProps {
  // Cả hai đều do backend tính; ứng dụng không tự suy mức rủi ro từ điểm.
  riskLevel: RiskLevel;
  riskScore: number | null;
}

// Thẻ kết luận: nền theo mức, biểu tượng, nhãn mức cỡ lớn, vòng điểm và lời khuyên.
export function VerdictCard({ riskLevel, riskScore }: VerdictCardProps) {
  const info = RISK_LEVELS[riskLevel];
  const palette = toneColors[info.tone];

  return (
    <View
      style={[styles.card, { backgroundColor: palette.soft, borderColor: palette.solid }]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Kết luận: ${info.label}. Điểm rủi ro ${riskScore ?? 'không có'} trên 100. ${info.advice}`}
    >
      <View style={styles.top}>
        <View style={styles.labelColumn}>
          <Icon name={info.icon} size={44} color={palette.solid} />
          <Text style={[styles.label, { color: palette.text }]}>{info.label}</Text>
        </View>
        {riskScore !== null ? (
          <View style={[styles.ring, { borderColor: palette.solid }]}>
            <Text style={[styles.score, { color: palette.text }]}>{riskScore}</Text>
            <Text style={[styles.outOf, { color: palette.text }]}>/100</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.advice}>{info.advice}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 2,
    padding: spacing.lg,
    gap: spacing.md,
    ...cardShadow,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  labelColumn: { flex: 1, gap: spacing.xs },
  label: { fontSize: 28, fontWeight: '800' },
  ring: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { ...typography.score, fontVariant: ['tabular-nums'] },
  outOf: { fontSize: 16, fontWeight: '600', marginTop: -4 },
  advice: { ...typography.body, fontWeight: '500' },
});
