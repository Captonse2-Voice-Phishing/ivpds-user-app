import { useEffect, useState } from 'react';
import { Alert, Animated, Easing, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../api/errors';
import type { Analysis, HistoryItem } from '../../api/types';
import { Button, Card, EmptyState, ErrorState, Icon, Notice, Screen, Skeleton } from '../../components';
import { analysisErrorInfo, apiErrorMessage } from '../../constants/errors';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { CallAudioCard } from './CallAudioCard';
import { CallInfoCard, IndicatorsCard, TechnicalDetailsCard, TranscriptCard } from './sections';
import { isAnalysisRunning, useCallResult } from './useCallResult';
import { VerdictCard } from './VerdictCard';

const STACK_EDGES = ['left', 'right', 'bottom'] as const;

export function CallResultScreen({ navigation, route }: RootStackScreenProps<'CallResult'>) {
  const { callId } = route.params;
  const { call, analysis, reanalyze, remove, forgetDeletedCall } = useCallResult(callId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([call.refetch(), analysis.refetch()]).finally(() => setRefreshing(false));
  };

  const startAnalysis = () => {
    setActionError(null);
    reanalyze.mutate(undefined, {
      onError: (error) => setActionError(apiErrorMessage(toApiError(error))),
    });
  };

  const confirmDelete = () => {
    Alert.alert('Xóa cuộc gọi', 'Ghi âm và kết quả phân tích của cuộc gọi này sẽ bị xóa vĩnh viễn.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setActionError(null);
          remove.mutate(undefined, {
            onSuccess: () => {
              navigation.goBack();
              forgetDeletedCall();
            },
            onError: (error) => setActionError(apiErrorMessage(toApiError(error))),
          });
        },
      },
    ]);
  };

  if (call.isPending) {
    return (
      <Screen edges={STACK_EDGES}>
        <LoadingSkeleton />
      </Screen>
    );
  }

  if (call.isError) {
    const error = toApiError(call.error);
    return (
      <Screen edges={STACK_EDGES} contentStyle={styles.centered}>
        {error.code === 'CALL_NOT_FOUND' ? (
          <EmptyState
            icon="trash-outline"
            title="Không tìm thấy cuộc gọi"
            message="Cuộc gọi này có thể đã bị xóa."
            actionLabel="Quay lại"
            onAction={() => navigation.goBack()}
          />
        ) : (
          <ErrorState message={apiErrorMessage(error)} onRetry={() => void call.refetch()} retrying={call.isRefetching} />
        )}
      </Screen>
    );
  }

  const item = call.data;
  const analysisError = analysis.isError ? toApiError(analysis.error) : null;
  const notAnalyzed = analysisError?.code === 'ANALYSIS_NOT_FOUND';
  const running = isAnalysisRunning(analysis.data?.status);
  const busy = reanalyze.isPending || remove.isPending;

  return (
    <Screen
      edges={STACK_EDGES}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      {/* Đã có kết quả thì vẫn hiện nó dù một lần hỏi lại vừa lỗi (ví dụ chập chờn mạng). */}
      {analysis.data ? (
        <AnalysisSections analysis={analysis.data} call={item} onRetry={startAnalysis} retrying={reanalyze.isPending} />
      ) : analysis.isPending ? (
        <Card>
          <Skeleton height={36} width="60%" />
          <Skeleton height={20} />
          <Skeleton height={20} width="80%" />
        </Card>
      ) : notAnalyzed ? (
        <Card>
          <Text style={typography.title}>Chưa phân tích</Text>
          <Text style={styles.muted}>Cuộc gọi này chưa được phân tích lần nào.</Text>
          <Button title="Phân tích ngay" icon="analytics-outline" onPress={startAnalysis} loading={reanalyze.isPending} />
        </Card>
      ) : analysisError ? (
        <Card>
          <ErrorState
            message={apiErrorMessage(analysisError)}
            onRetry={() => void analysis.refetch()}
            retrying={analysis.isRefetching}
          />
        </Card>
      ) : null}

      <CallInfoCard call={item} />
      {!running ? <CallAudioCard callId={callId} durationSeconds={item.durationSeconds} /> : null}

      {analysis.data?.status === 'COMPLETED' ? (
        <TechnicalDetailsCard confidence={analysis.data.confidence} details={analysis.data.details} />
      ) : null}

      {actionError ? <Notice tone="danger" message={actionError} /> : null}

      {/* Đang phân tích thì backend không cho phân tích lại hay xóa (ANALYSIS_IN_PROGRESS). */}
      {!running && !analysis.isPending ? (
        <View style={styles.actions}>
          {analysis.data?.status === 'COMPLETED' && item.callerNumber && !item.callerBlacklisted ? (
            <Button
              title="Báo cáo số này"
              variant="secondary"
              icon="flag-outline"
              disabled={busy}
              onPress={() =>
                navigation.navigate('ReportNumber', { callId, phoneNumber: item.callerNumber ?? undefined })
              }
            />
          ) : null}
          {analysis.data?.status === 'COMPLETED' ? (
            <Button
              title="Phân tích lại"
              variant="secondary"
              icon="refresh"
              onPress={startAnalysis}
              loading={reanalyze.isPending}
              disabled={remove.isPending}
            />
          ) : null}
          <Button
            title="Xóa"
            variant="danger"
            icon="trash-outline"
            onPress={confirmDelete}
            loading={remove.isPending}
            disabled={reanalyze.isPending}
          />
        </View>
      ) : null}
    </Screen>
  );
}

interface AnalysisSectionsProps {
  analysis: Analysis;
  call: HistoryItem;
  onRetry: () => void;
  retrying: boolean;
}

// Phần đầu màn hình, đổi theo trạng thái của lần phân tích.
function AnalysisSections({ analysis, call, onRetry, retrying }: AnalysisSectionsProps) {
  if (isAnalysisRunning(analysis.status)) {
    return (
      <Card style={styles.centeredCard}>
        <PulsingIcon />
        <Text style={[typography.title, styles.textCenter]}>Đang phân tích cuộc gọi…</Text>
        <Text style={[styles.muted, styles.textCenter]}>
          {analysis.status === 'PENDING' ? 'Đang chờ tới lượt' : 'Đang nghe và đánh giá nội dung'}
        </Text>
        <Text style={[typography.small, styles.textCenter]}>
          Bạn có thể rời màn hình này, chúng tôi sẽ thông báo khi có kết quả.
        </Text>
      </Card>
    );
  }

  if (analysis.status === 'FAILED') {
    // Lỗi: không hiện điểm hay mức rủi ro nào.
    const info = analysisErrorInfo(analysis.errorCode);
    return (
      <Card style={styles.centeredCard}>
        <Icon name="warning-outline" size={56} color={colors.neutral} />
        <Text style={[typography.heading, styles.textCenter]}>Không phân tích được</Text>
        <Text style={[typography.body, styles.textCenter]}>{info.message}</Text>
        {info.retryable ? (
          <Button title="Thử lại" icon="refresh" onPress={onRetry} loading={retrying} />
        ) : null}
      </Card>
    );
  }

  return (
    <>
      {analysis.riskLevel ? (
        <VerdictCard riskLevel={analysis.riskLevel} riskScore={analysis.riskScore} />
      ) : (
        <Notice tone="neutral" message="Hệ thống chưa đưa ra được mức rủi ro cho cuộc gọi này." />
      )}
      {call.callerBlacklisted ? (
        <Notice tone="danger" icon="ban" message="Số này nằm trong danh sách đen" />
      ) : null}
      <IndicatorsCard indicators={analysis.indicators ?? []} />
      {analysis.transcript ? <TranscriptCard transcript={analysis.transcript} /> : null}
    </>
  );
}

// Hình động nhẹ trong lúc chờ; không có phần trăm vì backend không báo tiến độ.
function PulsingIcon() {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View style={[styles.pulse, { transform: [{ scale }] }]}>
      <Icon name="pulse" size={40} color={colors.primary} />
    </Animated.View>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <Card>
        <Skeleton height={36} width="60%" />
        <Skeleton height={20} />
        <Skeleton height={20} width="80%" />
      </Card>
      <Card>
        <Skeleton height={24} width="40%" />
        <Skeleton height={18} />
        <Skeleton height={18} width="70%" />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: 'center' },
  centeredCard: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  muted: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.md },
  pulse: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
