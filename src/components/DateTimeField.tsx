import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, touchTarget, typography } from '../theme';
import { formatDate, formatDateTime } from '../utils/format';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  maximumDate?: Date;
  disabled?: boolean;
  // 'date': chỉ chọn ngày (dùng cho bộ lọc); mặc định chọn cả ngày lẫn giờ.
  mode?: 'datetime' | 'date';
}

// Ô chọn ngày giờ, không bắt buộc (có nút xóa).
export function DateTimeField({
  label,
  value,
  onChange,
  placeholder = 'Chưa chọn',
  maximumDate,
  disabled = false,
  mode = 'datetime',
}: DateTimeFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const format = mode === 'date' ? formatDate : formatDateTime;

  const clamp = (date: Date) => (maximumDate && date > maximumDate ? maximumDate : date);

  const open = () => {
    if (Platform.OS !== 'android') {
      setIosOpen((current) => !current);
      return;
    }
    // Android không có bộ chọn ngày-giờ chung: chọn ngày xong mới chọn giờ.
    const start = value ?? new Date();
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      maximumDate,
      onValueChange: (_dateEvent, pickedDate) => {
        if (mode === 'date') {
          onChange(clamp(pickedDate));
          return;
        }
        DateTimePickerAndroid.open({
          value: pickedDate,
          mode: 'time',
          is24Hour: true,
          onValueChange: (_timeEvent, pickedTime) => onChange(clamp(pickedTime)),
        });
      },
    });
  };

  return (
    <View style={styles.wrapper}>
      <Text style={typography.bodyStrong}>{label}</Text>
      <View style={[styles.row, disabled && styles.disabled]}>
        <Pressable
          onPress={open}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? format(value) : placeholder}`}
          style={styles.valueButton}
        >
          <Icon name="calendar-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value ? format(value) : placeholder}
          </Text>
        </Pressable>
        {value ? (
          <IconButton
            icon="close-circle"
            accessibilityLabel={`Xóa ${label.toLowerCase()}`}
            onPress={() => onChange(null)}
            color={colors.textSecondary}
            disabled={disabled}
          />
        ) : null}
      </View>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode={mode}
          display="spinner"
          maximumDate={maximumDate}
          onValueChange={(_event, picked) => onChange(clamp(picked))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  valueButton: {
    flex: 1,
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  value: { fontSize: 16, color: colors.text },
  placeholder: { color: colors.neutral },
  disabled: { opacity: 0.5 },
});
