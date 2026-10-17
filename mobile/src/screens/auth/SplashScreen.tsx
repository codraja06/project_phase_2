import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { AuthStackParamList } from '../../types/navigation';
import { COLORS } from '../../theme/colors';
import { TYPOGRAPHY } from '../../theme/typography';
import { SPACING } from '../../theme/spacing';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { CivicTrackLogo } from '../../components/CivicTrackLogo';
import { BrandBackdrop } from '../../components/CivicVisuals';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('CitizenLogin');
    }, 2500); // slightly longer for the animation to finish

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <BrandBackdrop photo="city" opacity={.74} />
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Clean White Background for App Launch */}

      {/* Floating Center Brand Card */}
      <Animated.View 
        entering={ZoomIn.springify().damping(15).stiffness(150).delay(600)} 
        style={styles.contentCard}
      >
        <Animated.View entering={FadeInDown.delay(900)} style={styles.logoBadgeContainer}>
          <CivicTrackLogo size="lg" showText={false} />
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(1000)} style={styles.appName}>
          Civic Track
        </Animated.Text>
        
        <Animated.View entering={FadeInUp.delay(1100)} style={styles.badgePill}>
          <Text style={styles.badgePillText}>SMART CIVIC RESOLUTION</Text>
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(1200)} style={styles.tagline}>
          Cleaner Cities • Brighter Tomorrows
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(1300)} style={styles.pillarsRow}>
          <Text style={styles.pillarText}>REPORT</Text>
          <Text style={styles.pillarDot}>•</Text>
          <Text style={styles.pillarText}>DETECT</Text>
          <Text style={styles.pillarDot}>•</Text>
          <Text style={styles.pillarText}>RESOLVE</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(1600)}>
          <ActivityIndicator size="small" color={COLORS.gold} style={{ marginTop: SPACING['3xl'] }} />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cinematic,
  },
  contentCard: {
    width: '88%',
    maxWidth: 520,
    backgroundColor: 'rgba(44,16,27,.62)',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING['5xl'],
    paddingHorizontal: SPACING['3xl'],
    alignItems: 'center',
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: '#744335',
  },
  logoBadgeContainer: {
    marginBottom: SPACING.lg,
  },
  appName: {
    ...TYPOGRAPHY.display,
    color: COLORS.onCinematic,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  badgePill: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.xl,
  },
  badgePillText: {
    ...TYPOGRAPHY.overline,
    color: COLORS.cinematic,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: '#F0DFDC',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  pillarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  pillarText: {
    ...TYPOGRAPHY.overline,
    color: COLORS.gold,
  },
  pillarDot: {
    fontSize: 14,
    color: COLORS.primaryLight,
    marginHorizontal: SPACING.md,
    fontWeight: '900',
  },
});
