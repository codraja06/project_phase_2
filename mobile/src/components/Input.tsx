import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, { useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { BORDER_RADIUS } from '../theme/radius';
import { TYPOGRAPHY } from '../theme/typography';
import { SPACING } from '../theme/spacing';
import { useShakeError } from '../hooks/useAnimations';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  inputStyle?: any;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  isPassword,
  secureTextEntry,
  style,
  inputStyle,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { shake, animatedStyle: shakeStyle } = useShakeError();

  const shouldSecure = isPassword || secureTextEntry;
  const isWeb = Platform.OS === 'web';

  // Trigger shake animation when error appears
  useEffect(() => {
    if (error) {
      shake();
    }
  }, [error, shake]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Animated.View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          isFocused && isWeb && (styles.webFocusHalo as any),
          Boolean(error) && isWeb && (styles.webErrorHalo as any),
          shakeStyle
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? COLORS.error : isFocused ? COLORS.primary : COLORS.slateMuted}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 0 } : {},
            shouldSecure ? { paddingRight: 40 } : {},
            isWeb ? ({ outline: 'none' } as any) : {},
            style,
            inputStyle,
          ]}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={shouldSecure && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          accessibilityLabel={label}
          {...props}
        />

        {shouldSecure && (
          <TouchableOpacity
            style={styles.rightIconBtn}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={COLORS.slateMuted}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={COLORS.error} style={{ marginRight: 6 }} />
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

export const PasswordInput: React.FC<Omit<InputProps, 'isPassword'>> = (props) => (
  <Input {...props} isPassword leftIcon="lock-closed-outline" />
);

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
    width: '100%',
  },
  label: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease' as any,
    } : {}),
  },
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.surface,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  webFocusHalo: {
    ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 0 3px ${COLORS.primaryGlow}` } as any) : {}),
  },
  webErrorHalo: {
    ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 0 3px rgba(220, 38, 38, 0.14)` } as any) : {}),
  },
  leftIcon: {
    marginRight: SPACING.md,
    marginLeft: SPACING.xs,
  },
  input: {
    flex: 1,
    minWidth: 0,
    ...TYPOGRAPHY.input,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    minHeight: 44,
  },
  rightIconBtn: {
    position: 'absolute',
    right: 4,
    width: 44,
    minHeight: 44,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    fontWeight: '600',
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },
});
