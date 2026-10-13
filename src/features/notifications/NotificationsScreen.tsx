import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../api/errors';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notifications';
import { queryKeys } from '../../api/queryKeys';
import type { AppNotification, PageResponse } from '../../api/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Notice,
  Screen,
  Skeleton,
  type IconName,
} from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import type { RootStackScreenProps } from '../../navigation/types';
import { cardShadow, colors, radius, spacing, toneColors, typography, type Tone } from '../../theme';
import { formatRelativeTime } from '../../utils/format';
import { lookup } from '../../utils/object';

const STACK_EDGES = ['left', 'right', 'bottom'] as const;

type NotificationPages = InfiniteData<PageResponse<AppNotification>, number>;

// Biểu tượng theo loại; loại lạ (backend thêm về sau) dùng biểu tượng chuông.
const TYPE_STYLES: Record<string, { icon: IconName; tone: Tone }> = {
  HIGH_RISK_CALL: { icon: 'warning', tone: 'danger' },
  SUSPICIOUS_CALL: { icon: 'alert-circle', tone: 'warning' },
  BLACKLISTED_CALLER: { icon: 'ban', tone: 'danger' },
};
const DEFAULT_TYPE_STYLE = { icon: 'notifications' as IconName, tone: 'neutral' as Tone };

export function NotificationsScreen({ navigation }: RootStackScreenProps<'Notifications'>) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useInfiniteQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last: PageResponse<AppNotification>) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });
  const unread = useQuery({ queryKey: queryKeys.notifications.unreadCount, queryFn: getUnreadCount });
  const items = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);

  // Lời nhắn "cuộc gọi đã bị xóa" tự ẩn sau vài giây.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    // Đổi ngay trên màn hình, không chờ máy chủ.
    onMutate: (id) => {
      queryClient.setQueryData<NotificationPages>(queryKeys.notifications.list, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
              })),
            }
          : old,
      );
      queryClient.setQueryData<number>(queryKeys.notifications.unreadCount, (count) =>
        typeof count === 'number' ? Math.max(0, count - 1) : count,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    onError: (error) => setActionError(apiErrorMessage(toApiError(error))),
  });

  const open = (item: AppNotification) => {
    setActionError(null);
    if (!item.read) markRead.mutate(item.id);
    if (item.callId) {
      navigation.navigate('CallResult', { callId: item.callId });
    } else {
      // Cuộc gọi đã bị xóa: chỉ đánh dấu đã đọc.
      setNotice('Cuộc gọi này đã bị xóa');
    }
  };

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([list.refetch(), unread.refetch()]).finally(() => setRefreshing(false));
  };

  if (list.isPending) {
    return (
      <Screen edges={STACK_EDGES}>
        {[0, 1, 2, 3].map((key) => (
          <Card key={key}>
            <Skeleton height={20} width="65%" />
            <Skeleton height={16} />
            <Skeleton height={16} width="40%" />
          </Card>
        ))}
      </Screen>
    );
  }

  if (list.isError && items.length === 0) {
    return (
      <Screen edges={STACK_EDGES} contentStyle={styles.centered}>
        <ErrorState
          message={apiErrorMessage(toApiError(list.error))}
          onRetry={() => void list.refetch()}
          retrying={list.isRefetching}
        />
      </Screen>
    );
  }

  const unreadCount = unread.data ?? items.filter((item) => !item.read).length;

  return (
    <Screen edges={STACK_EDGES} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        renderItem={({ item }) => <NotificationRow item={item} onPress={() => open(item)} />}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={[typography.small, styles.flex]}>
                  {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Đã đọc hết'}
                </Text>
                <Button
                  title="Đánh dấu đã đọc tất cả"
                  variant="ghost"
                  icon="checkmark-done"
                  onPress={() => {
                    setActionError(null);
                    markAll.mutate();
                  }}
                  loading={markAll.isPending}
                  disabled={unreadCount === 0}
                />
              </View>
              {notice ? <Notice tone="neutral" message={notice} /> : null}
              {actionError ? <Notice tone="danger" message={actionError} /> : null}
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        ListFooterComponent={
          list.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Chưa có thông báo nào"
            message="Khi một cuộc gọi bị đánh giá đáng ngờ hoặc có nguy cơ cao, bạn sẽ thấy thông báo ở đây."
          />
        }
      />
    </Screen>
  );
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const style = lookup(TYPE_STYLES, item.type) ?? DEFAULT_TYPE_STYLE;
  const palette = toneColors[style.tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : 'Chưa đọc. '}${item.title}. ${item.message}`}
      style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconCircle, { backgroundColor: palette.soft }]}>
        <Icon name={style.icon} size={24} color={palette.solid} />
      </View>
      <View style={styles.flex}>
        {/* title và message do backend viết sẵn bằng tiếng Việt: hiển thị nguyên văn. */}
        <Text style={styles.title}>{item.title}</Text>
        <Text style={typography.body} numberOfLines={3}>
          {item.message}
        </Text>
        <Text style={typography.small}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      {!item.read ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  centered: { justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  header: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  footer: { paddingVertical: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    ...cardShadow,
  },
  rowUnread: { backgroundColor: colors.primarySoft },
  rowPressed: { opacity: 0.8 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.bodyStrong, fontWeight: '700' },
  unreadDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, marginTop: 6 },
});
