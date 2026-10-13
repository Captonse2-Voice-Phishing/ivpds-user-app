import { useNetworkState } from 'expo-network';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { Icon } from './Icon';

// Chỉ hiện khi hệ điều hành báo chắc chắn không có kết nối (chưa rõ thì không hiện).
export function OfflineBanner() {
  const network = useNetworkState();
  if (network.isConnected !== false) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Icon name="cloud-offline-outline" size={20} color={colors.textOnPrimary} />
      <Text style={styles.text}>Không có kết nối mạng</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutralText,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: { fontSize: 16, fontWeight: '600', color: colors.textOnPrimary },
});
