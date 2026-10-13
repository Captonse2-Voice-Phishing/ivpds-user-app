import { useState, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, touchTarget, typography } from '../theme';
import { IconButton } from './IconButton';
import { useRevealFocusedInput } from './Screen';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  // Lỗi hiện đỏ ngay dưới ô.
  error?: string | null;
  hint?: string;
  // Ô mật khẩu: có nút hiện/ẩn.
  password?: boolean;
  // Chữ to hơn, cho ô nhập là trọng tâm của màn hình (tra cứu số).
  large?: boolean;
  ref?: Ref<TextInput>;
}

export function TextField({
  label,
  error,
  hint,
  password = false,
  large = false,
  ref,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const revealFocusedInput = useRevealFocusedInput();
  const hasError = Boolean(error);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          hasError && styles.inputRowError,
          inputProps.editable === false && styles.inputRowReadOnly,
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.neutral}
          autoCapitalize={password ? 'none' : inputProps.autoCapitalize}
          autoCorrect={password ? false : inputProps.autoCorrect}
          {...inputProps}
          secureTextEntry={password ? hidden : inputProps.secureTextEntry}
          onFocus={(event) => {
            setFocused(true);
            // Chuyển sang ô khác khi bàn phím đang mở: cuộn ô mới vào tầm nhìn.
            setTimeout(revealFocusedInput, 100);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          style={[styles.input, large && styles.inputLarge, inputProps.multiline && styles.inputMultiline]}
        />
        {password ? (
          <IconButton
            icon={hidden ? 'eye-outline' : 'eye-off-outline'}
            accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
            onPress={() => setHidden((value) => !value)}
            color={colors.textSecondary}
          />
        ) : null}
      </View>
      {hasError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.bodyStrong },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputRowFocused: { borderColor: colors.primary },
  inputRowError: { borderColor: colors.danger },
  inputRowReadOnly: { backgroundColor: colors.neutralSoft },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputLarge: { fontSize: 24, fontWeight: '600', paddingVertical: spacing.lg },
  inputMultiline: { minHeight: 112, textAlignVertical: 'top' },
  error: { ...typography.small, color: colors.dangerText },
  hint: { ...typography.small },
});
