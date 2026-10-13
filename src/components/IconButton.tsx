import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, touchTarget } from '../theme';
import { Icon, type IconName } from './Icon';

interface IconButtonProps {
  icon: IconName;
  // Bắt buộc: nút chỉ có biểu tượng phải có nhãn cho trình đọc màn hình.
  accessibilityLabel: string;
  onPress: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = colors.primary,
  size = 24,
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.5 },
});
