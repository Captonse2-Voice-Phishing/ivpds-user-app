import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ErrorState, Screen } from '../../components';
import { colors, spacing, typography } from '../../theme';

interface BootScreenProps {
  // Có lỗi (không gọi được máy chủ) thì hiện câu lỗi và nút thử lại.
  errorMessage: string | null;
  onRetry: () => void;
}

// Màn hình chờ lúc mở ứng dụng, trong khi khôi phục phiên đăng nhập.
export function BootScreen({ errorMessage, onRetry }: BootScreenProps) {
  return (
    <Screen scroll={false} contentStyle={styles.center}>
      <View style={styles.brand}>
        <Text style={styles.logo}>IVPDS</Text>
        <Text style={styles.tagline}>Phát hiện lừa đảo qua cuộc gọi</Text>
      </View>
      {errorMessage ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : (
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Đang tải" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.xxl, padding: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: { fontSize: 44, fontWeight: '800', color: colors.primary },
  tagline: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
