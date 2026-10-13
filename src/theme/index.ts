import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  primary: '#1F4E79',
  primaryPressed: '#173B5C',
  primarySoft: '#E3ECF5',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#1B2430',
  textSecondary: '#5A6675',
  textOnPrimary: '#FFFFFF',
  border: '#D5DBE3',
  // Màu mức rủi ro: dùng cho vạch, biểu tượng, nền đậm.
  danger: '#D4380D',
  warning: '#D48806',
  success: '#389E0D',
  neutral: '#6B7785',
  // Bản đậm hơn để chữ trên nền nhạt vẫn dễ đọc.
  dangerText: '#A82A08',
  warningText: '#8A5A00',
  successText: '#276E08',
  neutralText: '#4A5562',
  dangerSoft: '#FDECE6',
  warningSoft: '#FDF4E0',
  successSoft: '#EAF6E3',
  neutralSoft: '#ECEFF3',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, card: 16, pill: 999 } as const;

// Vùng bấm tối thiểu 48×48.
export const touchTarget = 48;

// Không đặt lineHeight cố định: trên Android, chữ đậm có lineHeight bị đo thiếu bề rộng
// và tự xuống dòng, làm mất chữ cuối của nhãn ngắn (ví dụ "Đáng ngờ" chỉ còn "Đáng").
export const typography = {
  body: { fontSize: 16, color: colors.text },
  bodyStrong: { fontSize: 16, fontWeight: '600', color: colors.text },
  small: { fontSize: 14, color: colors.textSecondary },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  score: { fontSize: 48, fontWeight: '700', color: colors.text },
} as const satisfies Record<string, TextStyle>;

export const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  android: { elevation: 2 },
  default: {
    shadowColor: '#0B1F33',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});

export type Tone = 'danger' | 'warning' | 'success' | 'neutral' | 'primary';

export const toneColors: Record<Tone, { solid: string; soft: string; text: string }> = {
  danger: { solid: colors.danger, soft: colors.dangerSoft, text: colors.dangerText },
  warning: { solid: colors.warning, soft: colors.warningSoft, text: colors.warningText },
  success: { solid: colors.success, soft: colors.successSoft, text: colors.successText },
  neutral: { solid: colors.neutral, soft: colors.neutralSoft, text: colors.neutralText },
  primary: { solid: colors.primary, soft: colors.primarySoft, text: colors.primary },
};
