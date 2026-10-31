import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { COLORS } from '../theme/colors';
import { BORDER_RADIUS } from '../theme/radius';
import { SHADOWS } from '../theme/index';
import { SPACING } from '../theme/spacing';
import { TYPOGRAPHY } from '../theme/typography';
import { usePressAnimation } from '../hooks/useAnimations';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  isSelected,
  onPress,
  count,
  style,
}) => {
  const { onPressIn, onPressOut, animatedStyle: pressStyle } = usePressAnimation(0.95);
  const isWeb = Platform.OS === 'web';

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(isSelected ? COLORS.primary : COLORS.surface, { duration: 200 }),
      borderColor: withTiming(isSelected ? COLORS.primary : COLORS.border, { duration: 200 }),
    };
  }, [isSelected]);

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      color: withTiming(isSelected ? COLORS.textInverse : COLORS.textSecondary, { duration: 200 }),
    };
  }, [isSelected]);

  return (
    <AnimatedPressable
      style={[
        styles.chip,
        animatedContainerStyle,
        pressStyle,
        style,
        isSelected && styles.chipSelected,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Animated.Text style={[styles.label, animatedTextStyle, isSelected && styles.labelSelected]}>
        {label}
      </Animated.Text>
      {count !== undefined && (
        <View style={[styles.countBadge, isSelected && styles.countBadgeSelected]}>
          <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
            {count}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

interface FilterChipGroupProps {
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FilterChipGroup: React.FC<FilterChipGroupProps> = ({
  options,
  selectedValue,
  onSelect,
  containerStyle,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.groupContainer, containerStyle]}
    >
      {options.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          count={opt.count}
          isSelected={selectedValue === opt.value}
          onPress={() => onSelect(opt.value)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1.5,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer' as any,
    } : {}),
  },
  chipSelected: {
    ...SHADOWS.sm,
  },
  label: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
  },
  labelSelected: {
    fontWeight: '800',
  },
  countBadge: {
    marginLeft: SPACING.xs,
    backgroundColor: COLORS.backgroundNeutral,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textSecondary,
  },
  countTextSelected: {
    color: COLORS.textInverse,
  },
});
