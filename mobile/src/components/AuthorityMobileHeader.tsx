import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileMenu } from '../contexts/MobileMenuContext';
import { TYPOGRAPHY } from '../theme/typography';
import { COLORS } from '../theme/colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Props {
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
}

export const AuthorityMobileHeader: React.FC<Props> = ({ title, subtitle, rightNode }) => {
  const { toggleMenu } = useMobileMenu();
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[
        styles.header,
        {
          paddingTop: insets.top + 12,
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
        }
      ]}
    >
      <TouchableOpacity onPress={toggleMenu} style={styles.menuBtn} accessibilityRole="button" accessibilityLabel="Open Menu">
        <Ionicons name="menu" size={24} color={COLORS.gold} />
      </TouchableOpacity>

      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightSection}>
        {rightNode}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cinematic,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gold,
    zIndex: 100,
  },
  menuBtn: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: COLORS.authorityPrimary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.onCinematic,
    fontSize: 18,
    lineHeight: 24
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    flexShrink: 0,
  }
});
