import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { useRevealFocusedInput } from './Screen';

interface CodeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string | null;
}

// Các ô nhập mã số. Thực chất là một TextInput trong suốt phủ lên các ô hiển thị,
// nên dán mã, tự điền từ SMS và trình đọc màn hình đều hoạt động như một ô bình thường.
export function CodeInput({ label, value, onChange, length = 6, error }: CodeInputProps) {
  const [focused, setFocused] = useState(false);
  const revealFocusedInput = useRevealFocusedInput();
  const hasError = Boolean(error);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View style={styles.wrapper}>
      <Text style={typography.bodyStrong}>{label}</Text>
      <View style={styles.row}>
        {Array.from({ length }, (_, index) => (
          <View
            key={index}
            style={[
              styles.box,
              focused && index === activeIndex && styles.boxActive,
              hasError && styles.boxError,
            ]}
          >
            <Text style={styles.digit}>{value[index] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
          keyboardType="number-pad"
          // Không đặt maxLength: nó đếm cả ký tự không phải số (khoảng trắng khi dán mã)
          // và cắt mất chữ số phía sau; độ dài đã được giới hạn ở onChangeText.
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          caretHidden
          onFocus={() => {
            setFocused(true);
            setTimeout(revealFocusedInput, 100);
          }}
          onBlur={() => setFocused(false)}
          style={styles.hiddenInput}
        />
      </View>
      {hasError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  box: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary, borderWidth: 2 },
  boxError: { borderColor: colors.danger },
  digit: { fontSize: 24, fontWeight: '700', color: colors.text },
  // Phủ kín hàng ô để bấm vào đâu cũng nhận; chữ trong suốt vì các ô đã hiện số.
  hiddenInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: 'transparent',
    fontSize: 1,
  },
  error: { ...typography.small, color: colors.dangerText },
});
