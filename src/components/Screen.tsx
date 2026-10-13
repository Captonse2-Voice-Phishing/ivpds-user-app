import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import { OfflineBanner } from './OfflineBanner';

interface ScreenProps {
  children: ReactNode;
  // false cho màn hình tự có danh sách cuộn (FlatList).
  scroll?: boolean;
  // Màn hình có thanh tiêu đề của navigator thì bỏ 'top'.
  edges?: readonly Edge[];
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_EDGES: readonly Edge[] = ['top', 'left', 'right'];

// Khoảng trống giữ lại giữa ô đang nhập và mép bàn phím.
const FOCUS_MARGIN = 24;

// Ô nhập gọi hàm này khi được chọn để Screen cuộn nó vào vùng không bị bàn phím che.
const RevealFocusedInputContext = createContext<() => void>(() => undefined);

export function useRevealFocusedInput() {
  return useContext(RevealFocusedInputContext);
}

export function Screen({
  children,
  scroll = true,
  edges = DEFAULT_EDGES,
  refreshControl,
  contentStyle,
}: ScreenProps) {
  const containerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const overlapRef = useRef(0);
  // Phần đáy của vùng nội dung bị bàn phím che.
  const [overlap, setOverlap] = useState(0);

  // Không dùng KeyboardAvoidingView: nó lấy vị trí so với view cha nên tính thiếu đúng bằng
  // chiều cao thanh tiêu đề / thanh tab, và bàn phím vẫn che ô nhập.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      // Chỉ dùng chiều cao bàn phím và tọa độ trong cửa sổ: trên Android, screenY của bàn phím
      // tính cả thanh trạng thái còn measureInWindow thì không, nên không so trực tiếp được.
      const keyboardHeight = event.endCoordinates.height;
      const windowHeight = Dimensions.get('window').height;
      containerRef.current?.measureInWindow((_x, y, _width, height) => {
        const gapBelowContainer = windowHeight - (y + height);
        const next = Math.max(0, keyboardHeight - gapBelowContainer);
        overlapRef.current = next;
        setOverlap(next);
      });
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      overlapRef.current = 0;
      setOverlap(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const revealFocusedInput = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const container = containerRef.current;
    if (!input || !container || !scrollRef.current) return;
    container.measureInWindow((_cx, containerY, _cw, containerHeight) => {
      const visibleBottom = containerY + containerHeight - overlapRef.current;
      input.measureInWindow((_ix, inputY, _iw, inputHeight) => {
        const hidden = inputY + inputHeight + FOCUS_MARGIN - visibleBottom;
        if (hidden > 0) {
          scrollRef.current?.scrollTo({ y: scrollOffset.current + hidden, animated: true });
        }
      });
    });
  }, []);

  // Bàn phím vừa mở (vùng cuộn vừa co lại): đưa ô đang nhập vào tầm nhìn.
  useEffect(() => {
    if (overlap <= 0) return;
    const timer = setTimeout(revealFocusedInput, 50);
    return () => clearTimeout(timer);
  }, [overlap, revealFocusedInput]);

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <OfflineBanner />
      <View ref={containerRef} style={[styles.flex, { paddingBottom: overlap }]} collapsable={false}>
        {scroll ? (
          <RevealFocusedInputContext.Provider value={revealFocusedInput}>
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={[styles.content, contentStyle]}
              // Bấm ra ngoài ô nhập thì đóng bàn phím, nhưng nút vẫn nhận được lần bấm đầu.
              keyboardShouldPersistTaps="handled"
              onScroll={(event) => {
                scrollOffset.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              refreshControl={refreshControl}
            >
              {children}
            </ScrollView>
          </RevealFocusedInputContext.Provider>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
});
