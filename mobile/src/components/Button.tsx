import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'info' | 'danger' | 'outline' | 'ghost';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  accessibilityLabel,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BORDER_RADIUS.md,
      minHeight: size === 'sm' ? 38 : size === 'lg' ? 52 : 48,
      paddingHorizontal: size === 'sm' ? 16 : size === 'lg' ? 26 : 20,
      paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 14 : 12,
      ...(isWeb ? { cursor: 'pointer' as any, transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)' as any } : {}),
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: isHovered ? COLORS.primaryHover : COLORS.primary,
          ...SHADOWS.button,
          borderWidth: 1,
          borderColor: isHovered ? COLORS.primaryHover : COLORS.primaryDark,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: isHovered ? COLORS.surface : COLORS.surface,
          borderWidth: 1.5,
          borderColor: isHovered ? COLORS.borderStrong : COLORS.border,
          ...SHADOWS.card,
        };
      case 'info':
        return {
          ...base,
          backgroundColor: isHovered ? COLORS.accentHover : COLORS.accent,
          ...SHADOWS.buttonAccent,
          borderWidth: 1,
          borderColor: isHovered ? COLORS.accentHover : COLORS.accentDark,
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: isHovered ? COLORS.errorDark : COLORS.error,
          borderWidth: 1,
          borderColor: COLORS.errorDark,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: isHovered ? COLORS.primaryLight : COLORS.surface,
          borderWidth: 1.5,
          borderColor: COLORS.primary,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: isHovered ? COLORS.surface : 'transparent',
        };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      flexShrink: 1,
      fontWeight: '700',
      fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
      letterSpacing: 0.2,
      textAlign: 'center',
    };

    switch (variant) {
      case 'primary':
      case 'info':
      case 'danger':
        return { ...base, color: COLORS.surface };
      case 'secondary':
        return { ...base, color: COLORS.textPrimary };
      case 'outline':
      case 'ghost':
        return { ...base, color: COLORS.primaryDark };
      default:
        return base;
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        getContainerStyle(),
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...({
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      } as any)}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'outline' || variant === 'ghost' ? COLORS.primary : COLORS.surface}
          style={styles.spinner}
        />
      ) : (
        <>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="primary" />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="secondary" />
);

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
    ...(Platform.OS === 'web' ? { cursor: 'not-allowed' as any, pointerEvents: 'none' as any } : {}),
  },
  spinner: {
    marginVertical: 2,
  },
  iconWrapper: {
    marginRight: 8,
  },
});
