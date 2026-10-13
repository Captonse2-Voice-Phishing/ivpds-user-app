import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, touchTarget } from '../theme';
import { Icon, type IconName } from './Icon';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

// Bộ chọn một trong vài lựa chọn nằm ngang.
export function Segmented<T extends string>({ options, value, onChange, disabled = false }: SegmentedProps<T>) {
  return (
    <View style={[styles.track, disabled && styles.disabled]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? colors.textOnPrimary : colors.primary;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            {option.icon ? <Icon name={option.icon} size={20} color={color} /> : null}
            <Text style={[styles.label, { color }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.card,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  segmentSelected: { backgroundColor: colors.primary },
  label: { fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
