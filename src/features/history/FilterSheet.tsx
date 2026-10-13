import { useEffect, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, DateTimeField, IconButton, Notice, TextField } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { HistoryFilters } from './filters';

interface FilterSheetProps {
  visible: boolean;
  filters: HistoryFilters;
  onApply: (filters: HistoryFilters) => void;
  onClose: () => void;
}

// Bảng lọc trượt từ dưới lên: khoảng thời gian và số người gọi.
export function FilterSheet({ visible, filters, onApply, onClose }: FilterSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Nội dung tách riêng để mỗi lần mở bảng là một bản nháp mới từ bộ lọc hiện tại. */}
      {visible ? <SheetContent filters={filters} onApply={onApply} onClose={onClose} /> : null}
    </Modal>
  );
}

function SheetContent({ filters, onApply, onClose }: Omit<FilterSheetProps, 'visible'>) {
  const insets = useSafeAreaInsets();
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [callerNumber, setCallerNumber] = useState(filters.callerNumber);
  const invalidRange = from !== null && to !== null && from > to;
  const [today] = useState(() => new Date());

  // Bảng nằm trong Modal, ngoài Screen, nên tự đẩy mình lên trên bàn phím.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Đóng bảng lọc" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg + keyboardHeight }]}>
        <View style={styles.header}>
          <Text style={[typography.title, styles.flex]}>Lọc lịch sử</Text>
          <IconButton icon="close" accessibilityLabel="Đóng" onPress={onClose} color={colors.textSecondary} />
        </View>

        <DateTimeField label="Từ ngày" mode="date" value={from} onChange={setFrom} maximumDate={today} />
        <DateTimeField label="Đến ngày" mode="date" value={to} onChange={setTo} maximumDate={today} />
        {invalidRange ? <Notice tone="danger" message="“Từ ngày” phải trước hoặc bằng “Đến ngày”." /> : null}
        <TextField
          label="Số người gọi"
          value={callerNumber}
          onChangeText={setCallerNumber}
          keyboardType="phone-pad"
          hint="Nhập một phần của số cũng được"
          maxLength={30}
        />

        <View style={styles.buttons}>
          <Button
            title="Xóa bộ lọc"
            variant="secondary"
            style={styles.flex}
            onPress={() => onApply({ ...filters, from: null, to: null, callerNumber: '' })}
          />
          <Button
            title="Áp dụng"
            style={styles.flex}
            disabled={invalidRange}
            onPress={() => onApply({ ...filters, from, to, callerNumber: callerNumber.trim() })}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11, 31, 51, 0.45)' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
