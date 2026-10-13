import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { getMyReports } from '../../api/blacklist';
import { toApiError } from '../../api/errors';
import { queryKeys } from '../../api/queryKeys';
import type { BlacklistReport, PageResponse } from '../../api/types';
import { Card, EmptyState, ErrorState, Screen, Skeleton, Tag } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import { REPORT_STATUS } from '../../constants/reports';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { formatDateTime } from '../../utils/format';

const STACK_EDGES = ['left', 'right', 'bottom'] as const;

export function MyReportsScreen({ navigation }: RootStackScreenProps<'MyReports'>) {
  const [refreshing, setRefreshing] = useState(false);
  const reports = useInfiniteQuery({
    queryKey: queryKeys.reports.all,
    queryFn: ({ pageParam }) => getMyReports(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last: PageResponse<BlacklistReport>) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });
  const items = useMemo(() => reports.data?.pages.flatMap((page) => page.items) ?? [], [reports.data]);

  const refresh = () => {
    setRefreshing(true);
    void reports.refetch().finally(() => setRefreshing(false));
  };

  if (reports.isPending) {
    return (
      <Screen edges={STACK_EDGES}>
        {[0, 1, 2].map((key) => (
          <Card key={key}>
            <Skeleton height={20} width="50%" />
            <Skeleton height={16} width="70%" />
          </Card>
        ))}
      </Screen>
    );
  }

  if (reports.isError && items.length === 0) {
    return (
      <Screen edges={STACK_EDGES} contentStyle={styles.centered}>
        <ErrorState
          message={apiErrorMessage(toApiError(reports.error))}
          onRetry={() => void reports.refetch()}
          retrying={reports.isRefetching}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={STACK_EDGES} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        renderItem={({ item }) => <ReportRow report={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (reports.hasNextPage && !reports.isFetchingNextPage) void reports.fetchNextPage();
        }}
        ListFooterComponent={
          reports.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="flag-outline"
            title="Bạn chưa báo cáo số nào"
            message="Khi gặp số lừa đảo, hãy báo cáo để quản trị viên xem xét chặn."
            actionLabel="Tra cứu một số"
            onAction={() => navigation.navigate('Main', { screen: 'Lookup' })}
          />
        }
      />
    </Screen>
  );
}

function ReportRow({ report }: { report: BlacklistReport }) {
  const status = REPORT_STATUS[report.status] ?? { label: report.status, tone: 'neutral' as const };
  return (
    <Card>
      <View style={styles.rowHeader}>
        <Text style={[typography.bodyStrong, styles.flex]}>{report.phoneNumber}</Text>
        <Tag label={status.label} tone={status.tone} />
      </View>
      <Text style={typography.small}>Báo cáo lúc {formatDateTime(report.createdAt)}</Text>
      {report.reason ? <Text style={typography.body}>{report.reason}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  footer: { paddingVertical: spacing.lg },
});
