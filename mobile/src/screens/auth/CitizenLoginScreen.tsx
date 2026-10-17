import React, { useState, useEffect } from 'react';
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
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types/navigation';
import { citizenLoginSchema, CitizenLoginForm } from '../../validation/schemas';
import { useAuth } from '../../hooks/useAuth';
import { Input, PasswordInput } from '../../components/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { CivicTrackLogo } from '../../components/CivicTrackLogo';
import { BrandBackdrop } from '../../components/CivicVisuals';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useStaggeredList } from '../../hooks/useAnimations';
import { ServerConfigModal } from '../../components/ServerConfigModal';

type Props = NativeStackScreenProps<AuthStackParamList, 'CitizenLogin'>;

export const CitizenLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, loginWithGoogle, savedSession, resumeSavedSession, clearSavedSession } = useAuth();
  const { isDesktop, isWide } = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverModalVisible, setServerModalVisible] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors }} = useForm<CitizenLoginForm>({
    resolver: zodResolver(citizenLoginSchema),
    defaultValues: {
      email: savedSession?.user?.email || '',
      password: ''}});

  useEffect(() => {
    if (savedSession?.user?.email) {
      setValue('email', savedSession.user.email);
    }
  }, [savedSession, setValue]);

  const onSubmit = async (data: CitizenLoginForm) => {
    try {
      setErrorMessage(null);
      setLoading(true);
      await login(data, 'citizen');
    } catch (error: any) {
      setErrorMessage(
        error.message || 'Unable to sign in. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSession = async () => {
    try {
      setErrorMessage(null);
      setResumeLoading(true);
      await resumeSavedSession('citizen');
    } catch (error: any) {
      setErrorMessage(error.message || 'Saved session expired. Please enter your password.');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage(null);
      setGoogleLoading(true);
      await loginWithGoogle('citizen');
    } catch (error: any) {
      if (error.message && error.message.includes('cancelled')) {
        return;
      }
      setErrorMessage(
        error.message || 'Google authentication could not be completed. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillDemoCitizen = () => {
    setValue('email', 'citizen@example.com');
    setValue('password', 'password123');
    setErrorMessage(null);
  };

  const isCitizenSaved = savedSession?.user && (savedSession.user.role || '').toLowerCase() === 'citizen';

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
              <BrandBackdrop photo="city" opacity={.67} />
              <Animated.View entering={FadeIn.duration(1000)} style={styles.brandingContent}>
                <View style={styles.logoWrapper}>
                  <CivicTrackLogo size="lg" showText={false} />
                </View>
                <Text style={styles.brandingTitle}>{'Our streets.\nOur future.'}</Text>
                <Text style={styles.brandingSubtitle}>
                  A photograph. A precise location. A voice for the places you call home. Report civic issues and follow their progress.
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(500)} style={styles.brandingFooter}>
                <Text style={styles.brandingFooterText}>City Resident Access • CivicTrack v1.0</Text>
              </Animated.View>
            </View>

            {/* Right Auth Side */}
            <ScrollView contentContainerStyle={styles.authSide}>
              <View style={styles.authWrapper}>
                <Animated.Text entering={FadeInDown.delay(100)} style={styles.authTitle}>Sign In</Animated.Text>
                <Animated.Text entering={FadeInDown.delay(200)} style={styles.authSubtitle}>Welcome back to CivicTrack.</Animated.Text>

                {errorMessage && (
                  <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.error} style={{ marginRight: SPACING.xs, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.errorBannerText}>{errorMessage}</Text>
                      {errorMessage.toLowerCase().includes('server') && (
                        <TouchableOpacity onPress={() => setServerModalVisible(true)} style={{ marginTop: 4 }}>
                          <Text style={styles.errorActionLink}>Check or change server address →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Animated.View>
                )}

                {isCitizenSaved && (
                  <Animated.View entering={FadeInDown.delay(300)}>
                    <Card style={styles.savedSessionCard}>
                      <CardContent style={styles.savedSessionContent}>
                        <View style={styles.savedAvatar}>
                          <Text style={styles.savedAvatarText}>
                            {(savedSession.user.name || 'C').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.savedGreeting}>Remembered Session</Text>
                          <Text style={styles.savedName} numberOfLines={1}>{savedSession.user.name || 'Citizen User'}</Text>
                          <Text style={styles.savedEmail} numberOfLines={1}>{savedSession.user.email}</Text>
                        </View>
                      </CardContent>
                      <View style={{ padding: SPACING.xl, paddingTop: 0 }}>
                        <Button title={`Continue as ${savedSession.user.name?.split(' ')[0] || 'Citizen'}`} onPress={handleResumeSession} loading={resumeLoading || loading} variant="default" style={{ marginBottom: SPACING.sm }} />
                        <Button title="Use another account" onPress={clearSavedSession} variant="ghost" />
                      </View>
                    </Card>
                  </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(isCitizenSaved ? 400 : 300)}>
                  <Card>
                    <CardContent>
                      <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, value } }) => (
                          <Input
                            label="Email Address"
                            placeholder="name@example.com"
                            value={value}
                            onChangeText={(text) => { onChange(text); if (errorMessage) setErrorMessage(null); }}
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
                        name="password"
                        render={({ field: { onChange, value } }) => (
                          <PasswordInput
                            label="Password"
                            placeholder="Enter your password"
                            value={value}
                            onChangeText={(text) => { onChange(text); if (errorMessage) setErrorMessage(null); }}
                            error={errors.password?.message}
                          />
                        )}
                      />

                      <TouchableOpacity style={styles.forgotBtn} accessibilityRole="button" onPress={() => setErrorMessage('Password reset is not configured. Please contact your account administrator.')}>
                        <Text style={styles.forgotText}>Forgot password?</Text>
                      </TouchableOpacity>

                      <Button title="Sign In" onPress={handleSubmit(onSubmit)} loading={loading} variant="default" size="lg" style={{ marginTop: SPACING.xs }} />

                      <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      <Button title="Continue with Google" onPress={handleGoogleLogin} loading={googleLoading || loading} variant="outline" size="lg" icon={<Ionicons name="logo-google" size={18} color="#EA4335" />} />
                    </CardContent>
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(isCitizenSaved ? 500 : 400)} style={styles.signUpRow}>
                  <Text style={styles.signUpText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('CitizenRegister')}>
                    <Text style={styles.signUpLink}>Create Account</Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(isCitizenSaved ? 600 : 500)} style={styles.altLoginRow}>
                  <TouchableOpacity onPress={fillDemoCitizen} style={styles.demoPillDesktop}>
                    <Ionicons name="flash" size={14} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
                    <Text style={styles.demoPillTextDesktop}>Auto-fill Demo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => navigation.navigate('AuthorityLogin')} style={styles.authoritySwitch}>
                    <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                    <Text style={styles.authoritySwitchText}>Officer Portal →</Text>
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
              <BrandBackdrop photo="city" opacity={.72} />
              <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoWrapperMobile}>
                <CivicTrackLogo size="md" showText={false} />
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(200)} style={styles.mobileTitle}>CivicTrack</Animated.Text>
              <Animated.Text entering={FadeInDown.delay(300)} style={styles.mobileSubtitle}>Citizen Action Portal</Animated.Text>
              <TouchableOpacity
                onPress={() => setServerModalVisible(true)}
                style={styles.serverPillBtn}
                accessibilityRole="button"
                accessibilityLabel="Server connection settings"
              >
                <Ionicons name="server-outline" size={13} color={COLORS.textSecondary} style={{ marginRight: 5 }} />
                <Text style={styles.serverPillText}>Server Settings</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mobileBody}>
              {errorMessage && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.error} style={{ marginRight: SPACING.xs, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                    {errorMessage.toLowerCase().includes('server') && (
                      <TouchableOpacity onPress={() => setServerModalVisible(true)} style={{ marginTop: 4 }}>
                        <Text style={styles.errorActionLink}>Check or change server address →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              )}

              {isCitizenSaved && (
                <Animated.View entering={FadeInDown.delay(400)}>
                  <Card style={styles.savedSessionCard}>
                    <CardContent style={styles.savedSessionContent}>
                      <View style={styles.savedAvatar}>
                        <Text style={styles.savedAvatarText}>
                          {(savedSession.user.name || 'C').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedGreeting}>Remembered Session</Text>
                        <Text style={styles.savedName} numberOfLines={1}>{savedSession.user.name || 'Citizen User'}</Text>
                        <Text style={styles.savedEmail} numberOfLines={1}>{savedSession.user.email}</Text>
                      </View>
                    </CardContent>
                    <View style={{ padding: SPACING.xl, paddingTop: 0 }}>
                      <Button title={`Continue as ${savedSession.user.name?.split(' ')[0] || 'Citizen'}`} onPress={handleResumeSession} loading={resumeLoading || loading} variant="default" style={{ marginBottom: SPACING.sm }} />
                      <Button title="Use another account" onPress={clearSavedSession} variant="ghost" />
                    </View>
                  </Card>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(isCitizenSaved ? 500 : 400)}>
                <Card>
                  <CardContent>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Email Address"
                          placeholder="name@example.com"
                          value={value}
                          onChangeText={(text) => { onChange(text); if (errorMessage) setErrorMessage(null); }}
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
                      name="password"
                      render={({ field: { onChange, value } }) => (
                        <PasswordInput
                          label="Password"
                          placeholder="Enter your password"
                          value={value}
                          onChangeText={(text) => { onChange(text); if (errorMessage) setErrorMessage(null); }}
                          error={errors.password?.message}
                        />
                      )}
                    />

                    <TouchableOpacity style={styles.forgotBtn} accessibilityRole="button" onPress={() => setErrorMessage('Password reset is not configured. Please contact your account administrator.')}>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>

                    <Button title="Sign In" onPress={handleSubmit(onSubmit)} loading={loading} variant="default" size="lg" style={{ marginTop: SPACING.xs }} />
                    
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or continue with</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <Button title="Continue with Google" onPress={handleGoogleLogin} loading={googleLoading || loading} variant="outline" size="lg" icon={<Ionicons name="logo-google" size={18} color="#EA4335" />} />
                  </CardContent>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(isCitizenSaved ? 600 : 500)} style={styles.signUpRow}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('CitizenRegister')}>
                  <Text style={styles.signUpLink}>Create Account</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(isCitizenSaved ? 700 : 600)} style={styles.altLoginRow}>
                <TouchableOpacity onPress={fillDemoCitizen} style={styles.demoPillDesktop}>
                  <Ionicons name="flash" size={14} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                  <Text style={styles.demoPillTextDesktop}>Auto-fill Demo</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('AuthorityLogin')} style={styles.authoritySwitch}>
                  <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                  <Text style={styles.authoritySwitchText}>Officer Portal →</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <ServerConfigModal visible={serverModalVisible} onClose={() => setServerModalVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  // Desktop
  desktopContainer: { flex: 1, flexDirection: 'row' },
  brandingSide: { flex: 1.2, backgroundColor: COLORS.backgroundNeutral, padding: 36, justifyContent: 'center', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' },
  brandingContent: { justifyContent: 'center', alignItems: 'flex-start', maxWidth: 520 },
  logoWrapper: { marginBottom: SPACING['3xl'], alignItems: 'center' },
  brandingTitle: { ...TYPOGRAPHY.display, color: COLORS.onCinematic, fontSize: 42, lineHeight: 49, marginBottom: SPACING.lg, textAlign: 'left', letterSpacing: -1.2 },
  brandingSubtitle: { ...TYPOGRAPHY.body, color: '#DDE9E4', lineHeight: 25, maxWidth: 420, textAlign: 'left' },
  brandingFooter: { position: 'absolute', bottom: SPACING['4xl'] },
  brandingFooterText: { ...TYPOGRAPHY.caption, color: COLORS.gold },
  authSide: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  authWrapper: { width: '100%', maxWidth: 460, paddingHorizontal: SPACING['3xl'], paddingVertical: SPACING['5xl'] },
  authTitle: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginBottom: SPACING.md },
  authSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING['4xl'] },
  
  // Mobile
  mobileContainer: { flexGrow: 1, backgroundColor: COLORS.background, paddingBottom: SPACING['4xl'] },
  mobileHeader: { backgroundColor: COLORS.backgroundNeutral, padding: SPACING['3xl'], paddingTop: SPACING.xl, paddingBottom: SPACING['4xl'], borderBottomLeftRadius: 20, borderBottomRightRadius: 20, alignItems: 'center', overflow: 'hidden', position: 'relative' },
  logoWrapperMobile: { marginBottom: SPACING.xl },
  mobileTitle: { ...TYPOGRAPHY.h1, color: COLORS.onCinematic, marginBottom: SPACING.xs },
  mobileSubtitle: { ...TYPOGRAPHY.body, color: COLORS.gold },
  mobileBody: { padding: SPACING['2xl'], marginTop: -20 },

  // Shared
  serverPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  serverPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  errorActionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.errorLight, padding: SPACING.lg, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.errorBorder },
  errorBannerText: { ...TYPOGRAPHY.caption, color: COLORS.errorDark, flex: 1, fontWeight: '600' },
  savedSessionCard: { backgroundColor: COLORS.backgroundNeutral, borderColor: COLORS.borderLight, marginBottom: SPACING['3xl'] },
  savedSessionContent: { flexDirection: 'row', alignItems: 'center', padding: SPACING.xl },
  savedAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.lg },
  savedAvatarText: { fontSize: 18, fontWeight: '900', color: COLORS.surface },
  savedGreeting: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  savedName: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  savedEmail: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 18, marginTop: -4 },
  forgotText: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING['2xl'] },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  dividerText: { marginHorizontal: SPACING.lg, ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING['3xl'] },
  signUpText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  signUpLink: { ...TYPOGRAPHY.bodySmall, fontWeight: '800', color: COLORS.primary },
  altLoginRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, paddingTop: SPACING.xl, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  demoPillDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight, padding: 10, borderRadius: BORDER_RADIUS.md },
  demoPillTextDesktop: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontWeight: '700' },
  backBtnMobile: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING['3xl'], backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.xl, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm },
  backBtnTextMobile: { ...TYPOGRAPHY.caption, color: COLORS.textPrimary, fontWeight: '700', marginLeft: SPACING.xs },
  authoritySwitch: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs },
  authoritySwitchText: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.primary }});
