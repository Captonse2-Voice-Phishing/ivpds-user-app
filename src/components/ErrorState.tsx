import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';

interface ErrorStateProps {
  // Câu tiếng Việt đã ánh xạ từ mã lỗi; không truyền lỗi kỹ thuật vào đây.
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({ message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Icon name="alert-circle-outline" size={48} color={colors.neutral} />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button title="Thử lại" icon="refresh" variant="secondary" onPress={onRetry} loading={retrying} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  message: { ...typography.body, textAlign: 'center' },
});
