import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { toApiError } from '../../api/errors';
import { getProfile, updateProfile } from '../../api/profile';
import { queryKeys } from '../../api/queryKeys';
import type { UserProfile } from '../../api/types';
import { logout } from '../../auth/session';
import { useSessionStore } from '../../auth/sessionStore';
import { Button, Card, Icon, Notice, Screen, type IconName } from '../../components';
import { apiErrorMessage } from '../../constants/errors';
import type { MainTabScreenProps } from '../../navigation/types';
import { getPushPermission, registerPushDevice, type PushPermission } from '../../push/pushNotifications';
import { colors, spacing, touchTarget, typography } from '../../theme';
import { givenName } from '../../utils/name';

export function AccountScreen({ navigation }: MainTabScreenProps<'Account'>) {
  const queryClient = useQueryClient();
  const sessionUser = useSessionStore((state) => state.user);
  const [loggingOut, setLoggingOut] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  const fullName = profile.data?.fullName ?? sessionUser?.fullName ?? '';
  const email = profile.data?.email ?? sessionUser?.email ?? '';

  // Công tắc cảnh báo danh sách đen: đổi ngay khi gạt, hoàn lại nếu backend báo lỗi.
  const toggleAlert = useMutation({
    mutationFn: (enabled: boolean) => updateProfile({ blacklistAlertEnabled: enabled }),
    onMutate: async (enabled) => {
      setAlertError(null);
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });
      const previous = queryClient.getQueryData<UserProfile>(queryKeys.profile);
      if (previous) {
        queryClient.setQueryData<UserProfile>(queryKeys.profile, { ...previous, blacklistAlertEnabled: enabled });
      }
      return { previous };
    },
    onError: (error, _enabled, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.profile, context.previous);
      setAlertError(apiErrorMessage(toApiError(error)));
    },
    onSuccess: (updated) => queryClient.setQueryData(queryKeys.profile, updated),
  });

  // Công tắc "Thông báo đẩy" phản ánh quyền thông báo của hệ điều hành.
  const [pushPermission, setPushPermission] = useState<PushPermission | null>(null);
  useEffect(() => {
    const refresh = () => {
      getPushPermission()
        .then(setPushPermission)
        .catch(() => setPushPermission('unsupported'));
    };
    refresh();
    // Người dùng có thể vừa đổi quyền trong Cài đặt rồi quay lại.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, []);

  const togglePush = (enabled: boolean) => {
    if (!enabled) {
      // Ứng dụng không tự tắt được quyền của hệ điều hành.
      Alert.alert('Tắt thông báo đẩy', 'Hãy tắt thông báo của IVPDS trong Cài đặt của máy.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    void registerPushDevice({ askPermission: true }).then((result) => {
      if (result === 'registered') {
        setPushPermission('granted');
      } else if (result === 'denied') {
        Alert.alert('Chưa bật được thông báo', 'Hãy cho phép thông báo của IVPDS trong Cài đặt của máy.', [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => void Linking.openSettings() },
        ]);
      } else if (result === 'error') {
        Alert.alert('Chưa bật được thông báo', 'Không đăng ký được thiết bị nhận thông báo. Hãy thử lại sau.');
      }
    });
  };

  const confirmLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          setLoggingOut(true);
          void logout();
        },
      },
    ]);
  };

  const initial = (givenName(fullName) || email || '?').charAt(0).toUpperCase();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.avatar} accessible accessibilityLabel={`Ảnh đại diện chữ ${initial}`}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={typography.heading}>{fullName}</Text>
          <Text style={styles.muted}>{email}</Text>
          {profile.data?.phoneNumber ? <Text style={styles.muted}>{profile.data.phoneNumber}</Text> : null}
        </View>
      </View>

      {profile.isError && !profile.data ? (
        <Notice tone="danger" message={apiErrorMessage(toApiError(profile.error))} />
      ) : null}

      <Group title="Hồ sơ">
        <LinkRow icon="person-outline" label="Sửa hồ sơ" onPress={() => navigation.navigate('EditProfile')} />
        <LinkRow icon="key-outline" label="Đổi mật khẩu" onPress={() => navigation.navigate('ChangePassword')} />
      </Group>

      <Group title="Cảnh báo">
        <SwitchRow
          label="Cảnh báo khi số gọi đến nằm trong danh sách đen"
          value={profile.data?.blacklistAlertEnabled ?? false}
          disabled={!profile.data}
          onChange={(enabled) => toggleAlert.mutate(enabled)}
        />
        {alertError ? <Notice tone="danger" message={alertError} /> : null}
        <SwitchRow
          label="Thông báo đẩy"
          value={pushPermission === 'granted'}
          disabled={pushPermission === null || pushPermission === 'unsupported'}
          onChange={togglePush}
        />
        {pushPermission === 'unsupported' ? (
          <Text style={typography.small}>Thông báo đẩy chưa dùng được trên bản cài đặt này.</Text>
        ) : null}
      </Group>

      <Group title="Khác">
        <LinkRow icon="flag-outline" label="Báo cáo của tôi" onPress={() => navigation.navigate('MyReports')} />
        <LinkRow
          icon="information-circle-outline"
          label="Giới thiệu"
          expanded={aboutOpen}
          onPress={() => setAboutOpen((open) => !open)}
        />
        {aboutOpen ? (
          <View style={styles.about}>
            <Text style={typography.bodyStrong}>IVPDS — Phát hiện lừa đảo qua cuộc gọi</Text>
            <Text style={styles.muted}>Phiên bản {Constants.expoConfig?.version ?? '—'}</Text>
            <Text style={typography.body}>Kết quả do hệ thống tự động đánh giá và có thể sai.</Text>
          </View>
        ) : null}
      </Group>

      <Button title="Đăng xuất" variant="danger" icon="log-out-outline" onPress={confirmLogout} loading={loggingOut} />
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Text style={typography.title}>{title}</Text>
      {children}
    </Card>
  );
}

interface LinkRowProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  // Có giá trị thì dòng này mở/đóng một phần nội dung thay vì chuyển màn hình.
  expanded?: boolean;
}

function LinkRow({ icon, label, onPress, expanded }: LinkRowProps) {
  const trailing: IconName = expanded === undefined ? 'chevron-forward' : expanded ? 'chevron-up' : 'chevron-down';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Icon name={icon} size={24} color={colors.primary} />
      <Text style={[typography.body, styles.flex]}>{label}</Text>
      <Icon name={trailing} size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

interface SwitchRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function SwitchRow({ label, value, onChange, disabled = false }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[typography.body, styles.flex]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  muted: { ...typography.body, color: colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: colors.textOnPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget },
  rowPressed: { opacity: 0.6 },
  about: { gap: spacing.xs, paddingLeft: spacing.xl + spacing.md },
});
