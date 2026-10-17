import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'yellow';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  size = 'md',
  variant = 'outline',
}) => {
  const height = size === 'sm' ? 38 : size === 'lg' ? 52 : 48;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  const isYellow = variant === 'yellow';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isYellow ? styles.yellowBtn : styles.outlineBtn,
        { height },
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator
          color={isYellow ? COLORS.darkCharcoal : COLORS.textPrimary}
          size="small"
        />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={fontSize + 3}
              color={isYellow ? COLORS.darkCharcoal : COLORS.textPrimary}
              style={{ marginRight: 8 }}
            />
          )}
          <Text
            style={[
              isYellow ? styles.yellowText : styles.outlineText,
              { fontSize },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  outlineBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.secondary, // Yellow border per theme
  },
  yellowBtn: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1.5,
    borderColor: COLORS.secondaryDark,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  outlineText: {
    color: COLORS.darkCharcoal, // Dark text
    fontWeight: '800',
  },
  yellowText: {
    color: COLORS.darkCharcoal,
    fontWeight: '800',
  },
});
