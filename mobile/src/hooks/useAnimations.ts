import { useEffect, useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

const TIMING_CONFIG = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

// ─── Global State for Reduced Motion ───────────────────────────────────────────
// While we can fetch this per hook, fetching it globally once is often sufficient
// for the initial mount, though it can change during runtime. We'll check per hook.

let isReducedMotion = Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => { isReducedMotion = enabled; });
AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
  isReducedMotion = enabled;
});

// ─── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Animated Entry (Fade & Slide Up)
 * Good for screen elements entering the view.
 */
export const useAnimatedEntry = (delayMs = 0, initialY = 20) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(initialY);

  useEffect(() => {
    if (isReducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(delayMs, withTiming(1, TIMING_CONFIG));
    translateY.value = withDelay(delayMs, withSpring(0, SPRING_CONFIG));
  }, [delayMs, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return animatedStyle;
};

/**
 * Staggered List Item Animation
 * Pass the index of the item to get a staggered delay.
 */
export const useStaggeredList = (index: number, staggerMs = 50, initialY = 20) => {
  return useAnimatedEntry(index * staggerMs, initialY);
};

/**
 * Press Animation (Scale down slightly when pressed)
 * Good for buttons and interactive cards.
 */
export const usePressAnimation = (scaleDownTo = 0.96) => {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (isReducedMotion) return;
    scale.value = withSpring(scaleDownTo, { damping: 10, stiffness: 200, mass: 0.5 });
  }, [scale, scaleDownTo]);

  const onPressOut = useCallback(() => {
    if (isReducedMotion) return;
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return { onPressIn, onPressOut, animatedStyle };
};

/**
 * Error Shake Animation
 * Triggers a side-to-side shake for form validation errors.
 */
export const useShakeError = () => {
  const translateX = useSharedValue(0);

  const shake = useCallback(() => {
    if (isReducedMotion) return;
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withRepeat(withTiming(10, { duration: 100 }), 3, true),
      withTiming(0, { duration: 50 })
    );
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return { shake, animatedStyle };
};

/**
 * Count Up Animation (Animated numbers for KPIs)
 * Note: Reanimated doesn't directly animate React Text content easily without a custom
 * animated component. Usually, it's better to use `react-native-reanimated` with `useAnimatedProps`
 * on a `TextInput` acting as a label, or manage state with requestAnimationFrame for text.
 * We provide a shared value that transitions to the target.
 */
export const useAnimatedNumber = (targetValue: number, durationMs = 1000) => {
  const value = useSharedValue(0);

  useEffect(() => {
    if (isReducedMotion) {
      value.value = targetValue;
      return;
    }
    value.value = withTiming(targetValue, { duration: durationMs, easing: Easing.out(Easing.cubic) });
  }, [targetValue, value, durationMs]);

  return value;
};
