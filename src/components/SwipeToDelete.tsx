import { useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme';
import { Icon } from './Icon';

const ACTION_WIDTH = 96;

interface SwipeToDeleteProps {
  children: ReactNode;
  // Gọi khi người dùng bấm nút Xóa lộ ra sau khi vuốt; việc xác nhận do nơi dùng lo.
  onDelete: () => void;
}

// Vuốt sang trái để lộ nút Xóa. Viết bằng PanResponder có sẵn, không cần thư viện cử chỉ.
export function SwipeToDelete({ children, onDelete }: SwipeToDeleteProps) {
  const [translateX] = useState(() => new Animated.Value(0));
  const [gesture] = useState(() => {
    let open = false;
    const snap = (toOpen: boolean) => {
      open = toOpen;
      Animated.spring(translateX, {
        toValue: toOpen ? -ACTION_WIDTH : 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    };
    const responder = PanResponder.create({
      // Chỉ nhận cử chỉ ngang rõ ràng, để cuộn dọc của danh sách vẫn mượt.
      onMoveShouldSetPanResponder: (_event, state) =>
        Math.abs(state.dx) > 12 && Math.abs(state.dx) > Math.abs(state.dy) * 1.5,
      onPanResponderMove: (_event, state) => {
        const base = open ? -ACTION_WIDTH : 0;
        translateX.setValue(Math.max(-ACTION_WIDTH, Math.min(0, base + state.dx)));
      },
      onPanResponderRelease: (_event, state) => {
        const base = open ? -ACTION_WIDTH : 0;
        snap(base + state.dx < -ACTION_WIDTH / 2);
      },
      onPanResponderTerminate: () => snap(open),
    });
    return { handlers: responder.panHandlers, close: () => snap(false) };
  });

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          gesture.close();
          onDelete();
        }}
        accessibilityRole="button"
        accessibilityLabel="Xóa"
        style={styles.action}
      >
        <Icon name="trash-outline" size={24} color={colors.textOnPrimary} />
        <Text style={styles.actionLabel}>Xóa</Text>
      </Pressable>
      <Animated.View style={{ transform: [{ translateX }] }} {...gesture.handlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radius.card, backgroundColor: colors.danger },
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionLabel: { fontSize: 14, fontWeight: '700', color: colors.textOnPrimary },
});
