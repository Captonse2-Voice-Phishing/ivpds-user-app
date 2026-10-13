import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HistoryItem } from '../../api/types';
import { Icon, RiskTag, Tag } from '../../components';
import { UNKNOWN_CALLER_LABEL } from '../../constants/calls';
import { indicatorInfo } from '../../constants/indicators';
import { RISK_LEVELS } from '../../constants/risk';
import { cardShadow, colors, radius, spacing, toneColors, typography } from '../../theme';
import { formatDateTime, formatDuration } from '../../utils/format';

const MAX_INDICATORS = 2;

interface CallRowProps {
  call: HistoryItem;
  onPress: () => void;
}

// Màu vạch mép trái: theo mức rủi ro; đang phân tích là màu chính; lỗi/chưa có kết quả là xám.
function stripeColor(call: HistoryItem): string {
  const analysis = call.analysis;
  if (analysis?.status === 'COMPLETED' && analysis.riskLevel) {
    return toneColors[RISK_LEVELS[analysis.riskLevel].tone].solid;
  }
  if (analysis?.status === 'PENDING' || analysis?.status === 'PROCESSING') return colors.primary;
  return colors.neutral;
}

function StatusTag({ call }: { call: HistoryItem }) {
  const analysis = call.analysis;
  if (!analysis) return <Tag label="Chưa phân tích" tone="neutral" />;
  if (analysis.status === 'PENDING' || analysis.status === 'PROCESSING') {
    return <Tag label="Đang phân tích" tone="primary" loading />;
  }
  if (analysis.status === 'FAILED') return <Tag label="Lỗi" tone="neutral" icon="warning-outline" />;
  // Mức rủi ro luôn lấy từ backend; thiếu thì không tự suy ra từ điểm.
  return analysis.riskLevel ? <RiskTag level={analysis.riskLevel} /> : <Tag label="Chưa có mức" tone="neutral" />;
}

// Một dòng cuộc gọi, dùng ở Trang chủ ("Gần đây") và Lịch sử.
export function CallRow({ call, onPress }: CallRowProps) {
  const indicators = call.analysis?.status === 'COMPLETED' ? (call.analysis.indicators ?? []) : [];
  const shown = indicators.slice(0, MAX_INDICATORS).map((code) => indicatorInfo(code).label);
  const extra = indicators.length - shown.length;
  const duration = formatDuration(call.durationSeconds);
  const when = formatDateTime(call.calledAt ?? call.createdAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Cuộc gọi ${call.callerNumber ?? UNKNOWN_CALLER_LABEL}, ${when}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.stripe, { backgroundColor: stripeColor(call) }]} />
      <View style={styles.body}>
        <View style={styles.line}>
          <View style={styles.caller}>
            <Text style={styles.callerText} numberOfLines={1}>
              {call.callerNumber ?? UNKNOWN_CALLER_LABEL}
            </Text>
            {call.callerBlacklisted ? (
              <View accessible accessibilityLabel="Số trong danh sách đen">
                <Icon name="ban" size={18} color={colors.danger} />
              </View>
            ) : null}
          </View>
          <StatusTag call={call} />
        </View>
        <Text style={typography.small}>{duration ? `${when} · ${duration}` : when}</Text>
        {shown.length > 0 ? (
          <Text style={styles.indicators} numberOfLines={2}>
            {shown.join(' · ')}
            {extra > 0 ? ` · +${extra}` : ''}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...cardShadow,
  },
  pressed: { backgroundColor: colors.primarySoft },
  stripe: { width: 6 },
  body: { flex: 1, padding: spacing.md, gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  caller: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 120 },
  callerText: { ...typography.bodyStrong, flexShrink: 1 },
  indicators: { fontSize: 14, color: colors.text },
});
