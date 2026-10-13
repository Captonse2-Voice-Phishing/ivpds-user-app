import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, touchTarget, typography } from '../theme';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'onPrimary';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<ButtonVariant, { background: string; pressed: string; text: string; border?: string }> = {
  primary: { background: colors.primary, pressed: colors.primaryPressed, text: colors.textOnPrimary },
  secondary: {
    background: colors.surface,
    pressed: colors.primarySoft,
    text: colors.primary,
    border: colors.primary,
  },
  danger: {
    background: colors.surface,
    pressed: colors.dangerSoft,
    text: colors.dangerText,
    border: colors.danger,
  },
  ghost: { background: 'transparent', pressed: colors.primarySoft, text: colors.primary },
  // Nút trắng đặt trên nền màu chính.
  onPrimary: { background: colors.surface, pressed: colors.primarySoft, text: colors.primary },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      // Đang gửi thì không bấm lại được.
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? palette.pressed : palette.background },
        palette.border ? { borderWidth: 1.5, borderColor: palette.border } : null,
        disabled && !loading ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={22} color={palette.text} /> : null}
          <Text style={[styles.label, { color: palette.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { ...typography.bodyStrong, textAlign: 'center', flexShrink: 1 },
  disabled: { opacity: 0.5 },
});
