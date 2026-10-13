import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconButton } from '../components';
import { cardShadow, colors, radius, spacing } from '../theme';
import { usePushBannerStore } from './pushBannerStore';
import { openPush } from './pushNotifications';

const AUTO_HIDE_MS = 6000;

// Dải thông báo ở đầu màn hình khi thông báo đẩy đến lúc ứng dụng đang mở.
export function PushBanner() {
  const insets = useSafeAreaInsets();
  const banner = usePushBannerStore((state) => state.banner);
  const hide = usePushBannerStore((state) => state.hide);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [banner, hide]);

  if (!banner) return null;

  return (
    <View style={[styles.wrapper, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          hide();
          openPush(banner.payload);
        }}
        accessibilityRole="alert"
        accessibilityLabel={`${banner.title}. ${banner.body}`}
        style={styles.banner}
      >
        <Icon name="notifications" size={24} color={colors.danger} />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>
            {banner.title}
          </Text>
          {banner.body ? (
            <Text style={styles.body} numberOfLines={3}>
              {banner.body}
            </Text>
          ) : null}
        </View>
        <IconButton icon="close" accessibilityLabel="Đóng thông báo" onPress={hide} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: spacing.md, right: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderLeftWidth: 6,
    borderLeftColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    ...cardShadow,
    elevation: 8,
  },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.textSecondary },
});
