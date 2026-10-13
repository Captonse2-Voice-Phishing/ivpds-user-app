import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AnalysisDetails, HistoryItem } from '../../api/types';
import { Button, Card, Icon } from '../../components';
import { CALL_SOURCE_LABELS, UNKNOWN_CALLER_LABEL } from '../../constants/calls';
import { indicatorInfo } from '../../constants/indicators';
import { colors, spacing, touchTarget, typography } from '../../theme';
import { formatDateTime, formatDuration, formatPercent } from '../../utils/format';

// Dấu hiệu phát hiện được: mỗi dấu hiệu một dòng có biểu tượng, tên và câu giải thích.
export function IndicatorsCard({ indicators }: { indicators: string[] }) {
  return (
    <Card>
      <Text style={typography.title}>Dấu hiệu phát hiện được</Text>
      {indicators.length === 0 ? (
        <Text style={styles.muted}>Không phát hiện dấu hiệu cụ thể nào.</Text>
      ) : (
        indicators.map((code) => {
          const info = indicatorInfo(code);
          return (
            <View key={code} style={styles.indicatorRow}>
              <Icon name="alert-circle" size={24} color={colors.danger} />
              <View style={styles.flex}>
                <Text style={typography.bodyStrong}>{info.label}</Text>
                {info.description ? <Text style={styles.muted}>{info.description}</Text> : null}
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

const COLLAPSED_LINES = 6;
// Ngắn hơn mức này thì chắc chắn không quá 6 dòng, không cần nút mở rộng.
const LONG_TRANSCRIPT_CHARS = 220;

// Nội dung cuộc gọi: mặc định thu gọn 6 dòng, có nút xem toàn bộ và nút sao chép.
export function TranscriptCard({ transcript }: { transcript: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const long = transcript.length > LONG_TRANSCRIPT_CHARS;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    void Clipboard.setStringAsync(transcript).then(() => setCopied(true));
  };

  return (
    <Card>
      <Text style={typography.title}>Nội dung cuộc gọi</Text>
      <Text style={typography.body} numberOfLines={expanded ? undefined : COLLAPSED_LINES} selectable>
        {transcript}
      </Text>
      <View style={styles.buttonRow}>
        {long ? (
          <Button
            title={expanded ? 'Thu gọn' : 'Xem toàn bộ'}
            variant="ghost"
            icon={expanded ? 'chevron-up' : 'chevron-down'}
            onPress={() => setExpanded((value) => !value)}
            style={styles.flex}
          />
        ) : null}
        <Button
          title={copied ? 'Đã sao chép' : 'Sao chép'}
          variant="ghost"
          icon={copied ? 'checkmark' : 'copy-outline'}
          onPress={copy}
          style={styles.flex}
        />
      </View>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// Thông tin cuộc gọi: số người gọi, thời điểm, thời lượng, nguồn.
export function CallInfoCard({ call }: { call: HistoryItem }) {
  return (
    <Card>
      <Text style={typography.title}>Thông tin</Text>
      <InfoRow label="Số người gọi" value={call.callerNumber ?? UNKNOWN_CALLER_LABEL} />
      {call.calledAt ? <InfoRow label="Thời điểm cuộc gọi" value={formatDateTime(call.calledAt)} /> : null}
      <InfoRow label="Gửi lên lúc" value={formatDateTime(call.createdAt)} />
      {call.durationSeconds !== null ? (
        <InfoRow label="Thời lượng" value={formatDuration(call.durationSeconds)} />
      ) : null}
      <InfoRow label="Nguồn" value={CALL_SOURCE_LABELS[call.source] ?? call.source} />
    </Card>
  );
}

interface TechnicalDetailsCardProps {
  confidence: number | null;
  details: AnalysisDetails | null;
}

// Mục thu gọn "Chi tiết kỹ thuật": ba con số khác nhau, không nhấn mạnh ở màn hình chính.
export function TechnicalDetailsCard({ confidence, details }: TechnicalDetailsCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel="Chi tiết kỹ thuật"
        accessibilityState={{ expanded: open }}
        style={styles.collapseHeader}
      >
        <Text style={[typography.title, styles.flex]}>Chi tiết kỹ thuật</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <>
          {confidence !== null ? (
            <InfoRow label="Độ chắc chắn của kết luận" value={formatPercent(confidence)} />
          ) : null}
          {details?.modelProbability !== null && details?.modelProbability !== undefined ? (
            <InfoRow label="Xác suất do model tính" value={formatPercent(details.modelProbability)} />
          ) : null}
          <Text style={styles.muted}>
            Xác suất của model chỉ là một thành phần của điểm rủi ro.
          </Text>
          {details?.sttModel ? <InfoRow label="Nhận dạng giọng nói" value={details.sttModel} /> : null}
          {details?.nlpModelVersion ? <InfoRow label="Model ngôn ngữ" value={details.nlpModelVersion} /> : null}
          {details?.rulesetVersion ? <InfoRow label="Bộ quy tắc" value={details.rulesetVersion} /> : null}
          {details?.riskEngineVersion ? (
            <InfoRow label="Bộ tính điểm rủi ro" value={details.riskEngineVersion} />
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { ...typography.body, color: colors.textSecondary },
  indicatorRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  infoRow: { gap: 2 },
  infoLabel: { ...typography.small },
  infoValue: { ...typography.bodyStrong },
  collapseHeader: { flexDirection: 'row', alignItems: 'center', minHeight: touchTarget },
});
