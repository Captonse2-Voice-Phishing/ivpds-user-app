import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../api/errors';
import { getUnreadCount } from '../../api/notifications';
import { queryKeys } from '../../api/queryKeys';
import { useSessionStore } from '../../auth/sessionStore';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Screen,
  Skeleton,
  TextField,
} from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import type { MainTabScreenProps } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme';
import { givenName } from '../../utils/name';
import { CallRow } from '../history/CallRow';
import { useRecentCalls } from '../history/useHistory';

const SAFETY_TIPS = [
  'Không đọc mã OTP cho bất kỳ ai.',
  'Cơ quan chức năng không làm việc qua điện thoại.',
  'Hãy gác máy và gọi lại số chính thức.',
];

export function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const fullName = useSessionStore((state) => state.user?.fullName);
  const [lookupNumber, setLookupNumber] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const recent = useRecentCalls();
  const unread = useQuery({ queryKey: queryKeys.notifications.unreadCount, queryFn: getUnreadCount });
  const unreadCount = unread.data ?? 0;

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([recent.refetch(), unread.refetch()]).finally(() => setRefreshing(false));
  };

  const lookup = () => {
    const phoneNumber = lookupNumber.trim();
    navigation.navigate('Lookup', phoneNumber ? { phoneNumber } : undefined);
  };

  const name = givenName(fullName);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <Text style={[typography.heading, styles.flex]} numberOfLines={2}>
          {name ? `Xin chào, ${name}` : 'Xin chào'}
        </Text>
        <View>
          <IconButton
            icon="notifications-outline"
            size={28}
            accessibilityLabel={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
            onPress={() => navigation.navigate('Notifications')}
          />
          {unreadCount > 0 ? (
            <View style={styles.badge} pointerEvents="none">
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Thẻ hành động chính */}
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Kiểm tra một cuộc gọi</Text>
        <View style={styles.actionButtons}>
          <Button
            title="Ghi âm"
            icon="mic"
            variant="onPrimary"
            style={styles.flex}
            onPress={() => navigation.navigate('Analyze', { mode: 'record' })}
          />
          <Button
            title="Chọn file"
            icon="folder-open"
            variant="onPrimary"
            style={styles.flex}
            onPress={() => navigation.navigate('Analyze', { mode: 'file' })}
          />
        </View>
      </View>

      {/* Tra cứu nhanh */}
      <Card>
        <TextField
          label="Tra cứu số điện thoại"
          value={lookupNumber}
          onChangeText={setLookupNumber}
          keyboardType="phone-pad"
          placeholder="Nhập số cần kiểm tra"
          returnKeyType="search"
          onSubmitEditing={lookup}
          maxLength={30}
        />
        <Button title="Tra cứu" icon="search" variant="secondary" onPress={lookup} />
      </Card>

      {/* Gần đây */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.title, styles.flex]}>Gần đây</Text>
        {recent.data && recent.data.items.length > 0 ? (
          <Button title="Xem tất cả" variant="ghost" onPress={() => navigation.navigate('History')} />
        ) : null}
      </View>
      {recent.isPending ? (
        <Card>
          <Skeleton height={20} width="55%" />
          <Skeleton height={16} width="75%" />
        </Card>
      ) : recent.isError && !recent.data ? (
        <Card>
          <ErrorState
            message={apiErrorMessage(toApiError(recent.error))}
            onRetry={() => void recent.refetch()}
            retrying={recent.isRefetching}
          />
        </Card>
      ) : recent.data.items.length === 0 ? (
        <Card>
          <EmptyState icon="call-outline" title="Bạn chưa kiểm tra cuộc gọi nào." />
        </Card>
      ) : (
        recent.data.items.map((call) => (
          <CallRow
            key={call.callId}
            call={call}
            onPress={() => navigation.navigate('CallResult', { callId: call.callId })}
          />
        ))
      )}

      {/* Mẹo an toàn */}
      <Card>
        <Text style={typography.title}>Mẹo an toàn</Text>
        {SAFETY_TIPS.map((tip) => (
          <View key={tip} style={styles.tip}>
            <Icon name="shield-checkmark" size={22} color={colors.success} />
            <Text style={[typography.body, styles.flex]}>{tip}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.textOnPrimary },
  actionCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionTitle: { fontSize: 22, fontWeight: '700', color: colors.textOnPrimary },
  actionButtons: { flexDirection: 'row', gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
});
