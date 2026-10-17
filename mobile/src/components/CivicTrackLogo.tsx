import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface CivicTrackLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
}

export const CivicTrackLogo: React.FC<CivicTrackLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
}) => {
  const iconSize = size === 'sm' ? 24 : size === 'md' ? 36 : size === 'lg' ? 52 : 68;
  const badgeSize = size === 'sm' ? 44 : size === 'md' ? 68 : size === 'lg' ? 96 : 120;
  const titleSize = size === 'sm' ? 18 : size === 'md' ? 22 : size === 'lg' ? 28 : 34;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize * .23,
          },
        ]}
      >
        <View style={styles.emblemContainer}>
          <Ionicons name="business-outline" size={iconSize} color={COLORS.gold} />
          <View style={{ width: '48%', height: 3, marginTop: 5, backgroundColor: COLORS.primary, borderRadius: 2 }} />
        </View>
      </View>

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Civic Track</Text>
          {showTagline && (
            <View style={styles.taglineWrapper}>
              <Text style={styles.taglineLine1}>Our streets. Our future.</Text>
              <Text style={styles.taglineLine2}>A stronger tomorrow, together.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: COLORS.cinematic,
    borderWidth: 2.5,
    borderColor: COLORS.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  emblemContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  buildingsIcon: {
    position: 'absolute',
    bottom: '22%',
    opacity: 0.45,
  },
  leafIcon: {
    position: 'absolute',
    top: '16%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  taglineWrapper: {
    alignItems: 'center',
    marginTop: 4,
  },
  taglineLine1: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    letterSpacing: 0.2,
  },
  taglineLine2: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    letterSpacing: 0.1,
  },
});
