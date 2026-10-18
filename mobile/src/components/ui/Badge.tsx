import React from 'react';
import { View, Text, ViewStyle, TextStyle, StyleProp } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { TYPOGRAPHY } from '../../theme/typography';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  animate?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ 
  label, 
  variant = 'default', 
  style, 
  textStyle, 
  icon,
  animate = false
}) => {
  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.full,
      alignSelf: 'flex-start',
    };

    switch (variant) {
      case 'default':
        base.backgroundColor = COLORS.primaryLight;
        base.borderWidth = 1;
        base.borderColor = COLORS.primarySurface;
        break;
      case 'secondary':
        base.backgroundColor = COLORS.backgroundNeutral;
        break;
      case 'destructive':
        base.backgroundColor = COLORS.errorLight;
        base.borderWidth = 1;
        base.borderColor = COLORS.errorBorder;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1;
        base.borderColor = COLORS.borderStrong;
        break;
      case 'success':
        base.backgroundColor = COLORS.successLight;
        base.borderWidth = 1;
        base.borderColor = COLORS.successBorder;
        break;
      case 'warning':
        base.backgroundColor = COLORS.warningLight;
        base.borderWidth = 1;
        base.borderColor = COLORS.warningDark;
        break;
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      ...TYPOGRAPHY.badge,
    };

    switch (variant) {
      case 'default':
        base.color = COLORS.primaryDark;
        break;
      case 'destructive':
        base.color = COLORS.errorDark;
        break;
      case 'success':
        base.color = COLORS.successDark;
        break;
      case 'warning':
        base.color = COLORS.warningDark;
        break;
      case 'secondary':
      case 'outline':
        base.color = COLORS.textSecondary;
        break;
    }

    return base;
  };

  const content = (
    <>
      {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
      <Text style={[getTextStyle(), textStyle]}>{label}</Text>
    </>
  );

  if (animate) {
    return (
      <Animated.View 
        style={[getContainerStyle(), style]}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        layout={Layout.springify().damping(14).stiffness(150)}
      >
        {content}
      </Animated.View>
    );
  }

  return (
    <View style={[getContainerStyle(), style]}>
      {content}
    </View>
  );
};
