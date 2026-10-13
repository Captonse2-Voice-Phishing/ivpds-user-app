import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, toneColors, type Tone } from '../theme';
import { Icon, type IconName } from './Icon';

interface NoticeProps {
  message: string;
  tone?: Tone;
  icon?: IconName;
}

const DEFAULT_ICONS: Record<Tone, IconName> = {
  danger: 'alert-circle',
  warning: 'alert-circle',
  success: 'checkmark-circle',
  neutral: 'information-circle',
  primary: 'information-circle',
};

// Dải thông báo trong trang: lỗi của cả form, lời nhắn thành công, lời giải thích.
export function Notice({ message, tone = 'primary', icon }: NoticeProps) {
  const palette = toneColors[tone];
  return (
    <View
      style={[styles.box, { backgroundColor: palette.soft, borderColor: palette.solid }]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'danger' ? 'polite' : 'none'}
    >
      <Icon name={icon ?? DEFAULT_ICONS[tone]} size={22} color={palette.text} />
      <Text style={[styles.text, { color: palette.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  text: { flex: 1, fontSize: 16 },
});
