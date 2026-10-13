import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

// Khung xương nhấp nháy nhẹ trong lúc tải dữ liệu.
export function Skeleton({ width = '100%', height = 16, style }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border, borderRadius: radius.sm },
});
