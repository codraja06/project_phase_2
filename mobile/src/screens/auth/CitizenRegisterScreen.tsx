import { authApi, SignupSession } from '../../api/authApi';
import { SignupVerificationScreen } from './SignupVerificationScreen';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types/navigation';
import { citizenRegisterSchema, CitizenRegisterForm } from '../../validation/schemas';
import { Input, PasswordInput } from '../../components/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { CivicTrackLogo } from '../../components/CivicTrackLogo';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { useBreakpoint } from '../../hooks/useBreakpoint';

type Props = NativeStackScreenProps<AuthStackParamList, 'CitizenRegister'>;

export const CitizenRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [signupSession, setSignupSession] = useState<SignupSession | null>(null);
  const { isDesktop, isWide } = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }} = useForm<CitizenRegisterForm>({
    resolver: zodResolver(citizenRegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''}});

  const onSubmit = async (data: CitizenRegisterForm) => {
    try {
      setErrorMessage(null);
      setLoading(true);
      const session = await authApi.requestSignupOtp({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        });
      reset(); setSignupSession(session);
    } catch (error: any) {
      setErrorMessage(
        error.message || 'Registration failed. Please verify your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (signupSession) return <SignupVerificationScreen session={signupSession} onSessionChange={setSignupSession} onBack={() => setSignupSession(null)} onSignIn={() => { setSignupSession(null); navigation.navigate('CitizenLogin'); }} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isWide ? (
          <View style={styles.desktopContainer}>
            {/* Left Branding Side */}
            <View style={styles.brandingSide}>

              <Animated.View entering={FadeIn.duration(1000)} style={styles.brandingContent}>
                <View style={styles.logoWrapper}>
                  <CivicTrackLogo size="lg" showText={false} />
                </View>
                <Text style={styles.brandingTitle}>{'Be part of a\nbetter neighbourhood.'}</Text>
                <Text style={styles.brandingSubtitle}>
                  Create your citizen profile to report municipal defects and track resolution in real-time.
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(500)} style={styles.brandingFooter}>
                <Text style={styles.brandingFooterText}>City Resident Access • CivicTrack v1.0</Text>
              </Animated.View>
            </View>

            {/* Right Auth Side */}
            <ScrollView contentContainerStyle={styles.authSide}>
              <View style={styles.authWrapper}>
                <Animated.View entering={FadeInDown.delay(100)}>
                  <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Back"
                    style={styles.backBtnDesktop}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.backBtnTextDesktop}>Back to Sign In</Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.Text entering={FadeInDown.delay(200)} style={styles.authTitle}>Create Account</Animated.Text>
                <Animated.Text entering={FadeInDown.delay(300)} style={styles.authSubtitle}>Enter your details below to register.</Animated.Text>

                {errorMessage && (
                  <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.error} style={{ marginRight: SPACING.xs }} />
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(400)}>
                  <Card>
                    <CardContent>
                      <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, value } }) => (
                          <Input
                            label="Full Legal Name"
                            placeholder="Enter full name"
                            value={value}
                            onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                            leftIcon="person-outline"
                            error={errors.name?.message}
                          />
                        )}
                      />

                      <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, value } }) => (
                          <Input
                            label="Email Address"
                            placeholder="name@example.com"
                            value={value}
                            onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            leftIcon="mail-outline"
                            error={errors.email?.message}
                          />
                        )}
                      />

                      <Controller
                        control={control}
                        name="phone"
                        render={({ field: { onChange, value } }) => (
                          <Input
                            label="Phone Number"
                            placeholder="+91 98765 43210"
                            value={value}
                            onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                            keyboardType="phone-pad"
                            leftIcon="call-outline"
                            error={errors.phone?.message}
                          />
                        )}
                      />

                      <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, value } }) => (
                          <PasswordInput
                            label="Security Password"
                            placeholder="At least 6 characters"
                            value={value}
                            onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                            error={errors.password?.message}
                          />
                        )}
                      />

                      <Controller
                        control={control}
                        name="confirmPassword"
                        render={({ field: { onChange, value } }) => (
                          <PasswordInput
                            label="Confirm Password"
                            placeholder="Re-enter your password"
                            value={value}
                            onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                            error={errors.confirmPassword?.message}
                          />
                        )}
                      />

                      <Button title="Send verification code" onPress={handleSubmit(onSubmit)} loading={loading} variant="default" size="lg" style={{ marginTop: SPACING.xs }} />
                    </CardContent>
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(500)} style={styles.signInRow}>
                  <Text style={styles.signInText}>Already have an active account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CitizenLogin')}>
                    <Text style={styles.signInLink}>Sign In</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.mobileContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.mobileHeader}>

              <Animated.View entering={FadeInDown.delay(100)}>
                <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Back"
                  style={styles.backBtnMobile}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
                  <Text style={styles.backBtnTextMobile}>Sign In</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.logoWrapperMobile}>
                <CivicTrackLogo size="md" showText={false} />
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(300)} style={styles.mobileTitle}>Join CivicTrack</Animated.Text>
              <Animated.Text entering={FadeInDown.delay(400)} style={styles.mobileSubtitle}>Citizen Enrollment</Animated.Text>
            </View>

            <View style={styles.mobileBody}>
              {errorMessage && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.error} style={{ marginRight: SPACING.xs }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(500)}>
                <Card>
                  <CardContent>
                    <Controller
                      control={control}
                      name="name"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Full Legal Name"
                          placeholder="Enter full name"
                          value={value}
                          onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                          leftIcon="person-outline"
                          error={errors.name?.message}
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Email Address"
                          placeholder="name@example.com"
                          value={value}
                          onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          leftIcon="mail-outline"
                          error={errors.email?.message}
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name="phone"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Phone Number"
                          placeholder="+91 98765 43210"
                          value={value}
                          onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                          keyboardType="phone-pad"
                          leftIcon="call-outline"
                          error={errors.phone?.message}
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, value } }) => (
                        <PasswordInput
                          label="Security Password"
                          placeholder="At least 6 characters"
                          value={value}
                          onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                          error={errors.password?.message}
                        />
                      )}
                    />

                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { onChange, value } }) => (
                        <PasswordInput
                          label="Confirm Password"
                          placeholder="Re-enter your password"
                          value={value}
                          onChangeText={(t) => { onChange(t); if (errorMessage) setErrorMessage(null); }}
                          error={errors.confirmPassword?.message}
                        />
                      )}
                    />

                    <Button title="Send verification code" onPress={handleSubmit(onSubmit)} loading={loading} variant="default" size="lg" style={{ marginTop: SPACING.xs }} />
                  </CardContent>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(600)} style={styles.signInRow}>
                <Text style={styles.signInText}>Already have an active account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('CitizenLogin')}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  // Desktop
  desktopContainer: { flex: 1, flexDirection: 'row' },
  brandingSide: { flex: 1.2, backgroundColor: COLORS.backgroundNeutral, padding: SPACING['7xl'], justifyContent: 'center', alignItems: 'center', position: 'relative' },
  brandingContent: { justifyContent: 'center', alignItems: 'center' },
  logoWrapper: { marginBottom: SPACING['3xl'], alignItems: 'center' },
  brandingTitle: { ...TYPOGRAPHY.display, color: COLORS.textPrimary, marginBottom: SPACING.lg, textAlign: 'center' },
  brandingSubtitle: { ...TYPOGRAPHY.h3, color: COLORS.textSecondary, lineHeight: 28, maxWidth: 420, textAlign: 'center' },
  brandingFooter: { position: 'absolute', bottom: SPACING['4xl'] },
  brandingFooterText: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  authSide: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  authWrapper: { width: '100%', maxWidth: 460, paddingHorizontal: SPACING['3xl'], paddingVertical: SPACING['5xl'] },
  backBtnDesktop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING['4xl'], alignSelf: 'flex-start' },
  backBtnTextDesktop: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: '600', marginLeft: SPACING.xs },
  authTitle: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginBottom: SPACING.md },
  authSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING['4xl'] },

  // Mobile
  mobileContainer: { flexGrow: 1, backgroundColor: COLORS.background, paddingBottom: SPACING['4xl'] },
  mobileHeader: { backgroundColor: COLORS.backgroundNeutral, padding: SPACING['3xl'], paddingTop: SPACING.xl, paddingBottom: SPACING['4xl'], borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center' },
  backBtnMobile: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING['3xl'], backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.xl, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm },
  backBtnTextMobile: { ...TYPOGRAPHY.caption, color: COLORS.textPrimary, fontWeight: '700', marginLeft: SPACING.xs },
  logoWrapperMobile: { marginBottom: SPACING.xl },
  mobileTitle: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  mobileSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  mobileBody: { padding: SPACING['2xl'], marginTop: -20 },

  // Shared
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.errorLight, padding: SPACING.lg, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.errorBorder },
  errorBannerText: { ...TYPOGRAPHY.caption, color: COLORS.errorDark, flex: 1, fontWeight: '600' },
  signInRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING['3xl'] },
  signInText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  signInLink: { ...TYPOGRAPHY.bodySmall, fontWeight: '800', color: COLORS.primary }});
