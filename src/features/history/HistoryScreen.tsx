import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../api/errors';
import type { HistoryItem } from '../../api/types';
import { Card, Chip, EmptyState, ErrorState, IconButton, Screen, Skeleton, SwipeToDelete } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import type { MainTabScreenProps } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';
import { CallRow } from './CallRow';
import { FilterSheet } from './FilterSheet';
import {
  EMPTY_FILTERS,
  hasAdvancedFilters,
  hasAnyFilter,
  QUICK_FILTERS,
  toHistoryQuery,
  type HistoryFilters,
} from './filters';
import { useDeleteCall, useHistoryList } from './useHistory';

const DELETE_ERRORS = { ANALYSIS_IN_PROGRESS: 'Cuộc gọi đang được phân tích, hãy thử lại sau.' };

export function HistoryScreen({ navigation }: MainTabScreenProps<'History'>) {
  const [filters, setFilters] = useState<HistoryFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const query = useMemo(() => toHistoryQuery(filters), [filters]);
  const history = useHistoryList(query);
  const deleteCall = useDeleteCall();

  const items = useMemo(() => history.data?.pages.flatMap((page) => page.items) ?? [], [history.data]);
  const filtered = hasAnyFilter(filters);

  const refresh = () => {
    setRefreshing(true);
    void history.refetch().finally(() => setRefreshing(false));
  };

  const confirmDelete = (call: HistoryItem) => {
    Alert.alert('Xóa cuộc gọi', 'Ghi âm và kết quả phân tích của cuộc gọi này sẽ bị xóa vĩnh viễn.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () =>
          deleteCall.mutate(call.callId, {
            onError: (error) =>
              Alert.alert('Không xóa được', apiErrorMessage(toApiError(error), DELETE_ERRORS)),
          }),
      },
    ]);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={[typography.heading, styles.flex]}>Lịch sử</Text>
        <View>
          <IconButton
            icon="options-outline"
            accessibilityLabel={hasAdvancedFilters(filters) ? 'Bộ lọc, đang bật' : 'Bộ lọc'}
            onPress={() => setSheetOpen(true)}
          />
          {hasAdvancedFilters(filters) ? <View style={styles.filterDot} /> : null}
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {QUICK_FILTERS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filters.quick === option.value}
              onPress={() => setFilters((current) => ({ ...current, quick: option.value }))}
            />
          ))}
        </ScrollView>
      </View>

      {history.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((key) => (
            <Card key={key}>
              <Skeleton height={20} width="55%" />
              <Skeleton height={16} width="75%" />
            </Card>
          ))}
        </View>
      ) : history.isError && items.length === 0 ? (
        <View style={styles.centered}>
          <ErrorState
            message={apiErrorMessage(toApiError(history.error))}
            onRetry={() => void history.refetch()}
            retrying={history.isRefetching}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.callId}
          contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
          renderItem={({ item }) => (
            <SwipeToDelete onDelete={() => confirmDelete(item)}>
              <CallRow call={item} onPress={() => navigation.navigate('CallResult', { callId: item.callId })} />
            </SwipeToDelete>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
          }}
          ListFooterComponent={
            history.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
          }
          ListEmptyComponent={
            filtered ? (
              <EmptyState
                icon="funnel-outline"
                title="Không có cuộc gọi phù hợp"
                actionLabel="Xóa bộ lọc"
                onAction={() => setFilters(EMPTY_FILTERS)}
              />
            ) : (
              <EmptyState
                icon="call-outline"
                title="Chưa có cuộc gọi nào"
                actionLabel="Kiểm tra một cuộc gọi"
                onAction={() => navigation.navigate('Analyze')}
              />
            )
          }
        />
      )}

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  centered: { flex: 1, justifyContent: 'center' },
  footer: { paddingVertical: spacing.lg },
});
