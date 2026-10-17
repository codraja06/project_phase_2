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
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types/navigation';
import { authorityLoginSchema, AuthorityLoginForm } from '../../validation/schemas';
import { useAuth } from '../../hooks/useAuth';
import { Input, PasswordInput } from '../../components/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { CivicTrackLogo } from '../../components/CivicTrackLogo';
import { BrandBackdrop } from '../../components/CivicVisuals';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ServerConfigModal } from '../../components/ServerConfigModal';

type Props = NativeStackScreenProps<AuthStackParamList, 'AuthorityLogin'>;

export const AuthorityLoginScreen: React.FC<Props> = ({ navigation }) => {
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
    formState: { errors }} = useForm<AuthorityLoginForm>({
    resolver: zodResolver(authorityLoginSchema),
    defaultValues: {
      email: savedSession?.user?.email || '',
      password: ''}});

  useEffect(() => {
    if (savedSession?.user?.email && (savedSession.user.role || '').toLowerCase() === 'authority') {
      setValue('email', savedSession.user.email);
    }
  }, [savedSession, setValue]);

  const onSubmit = async (data: AuthorityLoginForm) => {
    try {
      setErrorMessage(null);
      setLoading(true);
      await login(data, 'authority');
    } catch (error: any) {
      setErrorMessage(
        error.message || 'Municipal authentication failed. Please verify credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSession = async () => {
    try {
      setErrorMessage(null);
      setResumeLoading(true);
      await resumeSavedSession('authority');
    } catch (error: any) {
      setErrorMessage(error.message || 'Saved officer session expired. Please enter password.');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage(null);
      setGoogleLoading(true);
      await loginWithGoogle('authority');
    } catch (error: any) {
      if (error.message && error.message.includes('cancelled')) {
        return;
      }
      setErrorMessage(
        error.message || 'Google officer authentication failed. Please try again.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillDemoOfficer = () => {
    setValue('email', 'officer@city.gov');
    setValue('password', 'password123');
    setErrorMessage(null);
  };

  const isOfficerSaved = savedSession?.user && (savedSession.user.role || '').toLowerCase() === 'authority';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.authorityDark} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isWide ? (
          <View style={styles.desktopContainer}>
            {/* Left Branding Side */}
            <View style={styles.brandingSide}>
              <BrandBackdrop photo="bridge" opacity={.67} />
              <Animated.View entering={FadeIn.duration(1000)} style={styles.brandingContent}>
                <View style={styles.brandingIcon}>
                  <CivicTrackLogo size="lg" showText={false} />
                </View>
                <Text style={styles.brandingTitle}>{'Civic service.\nVisible progress.'}</Text>
                <Text style={styles.brandingSubtitle}>
                  Review citizen evidence, organise attention, and keep your community informed as work progresses.
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(500)} style={styles.brandingFooter}>
                <Text style={styles.brandingFooterText}>Municipal officer access • CivicTrack v1.0</Text>
              </Animated.View>
            </View>

            {/* Right Auth Side */}
            <ScrollView contentContainerStyle={styles.authSide}>
              <View style={styles.authWrapper}>
                <Animated.View entering={FadeInDown.delay(100)}>
                  <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Back"
                    style={styles.backBtnDesktop}
                    onPress={() => navigation.navigate('CitizenLogin')}
                  >
                    <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.backBtnTextDesktop}>Back to Citizen Portal</Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.Text entering={FadeInDown.delay(200)} style={styles.authTitle}>Officer Sign In</Animated.Text>
                <Animated.Text entering={FadeInDown.delay(300)} style={styles.authSubtitle}>Authenticate to access the command center.</Animated.Text>

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

                {isOfficerSaved && (
                  <Animated.View entering={FadeInDown.delay(400)}>
                    <Card style={styles.savedSessionCard}>
                      <CardContent style={styles.savedSessionContent}>
                        <View style={styles.savedAvatar}>
                          <Ionicons name="shield" size={20} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.savedGreeting}>Remembered Officer Session</Text>
                          <Text style={styles.savedName} numberOfLines={1}>{savedSession.user.name || 'Municipal Officer'}</Text>
                          <Text style={styles.savedEmail} numberOfLines={1}>{savedSession.user.email}</Text>
                        </View>
                      </CardContent>
                      <View style={{ padding: SPACING.xl, paddingTop: 0 }}>
                        <Button title={`Resume Officer Session`} onPress={handleResumeSession} loading={resumeLoading || loading} variant="default" style={{ marginBottom: SPACING.sm }} />
                        <Button title="Use another credential" onPress={clearSavedSession} variant="ghost" />
                      </View>
                    </Card>
                  </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(isOfficerSaved ? 500 : 400)}>
                  <Card>
                    <CardContent>
                      <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, value } }) => (
                          <Input
                            label="Department Official Email"
                            placeholder="officer@city.gov"
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
                            label="Officer Security Password"
                            placeholder="Enter security password"
                            value={value}
                            onChangeText={(text) => { onChange(text); if (errorMessage) setErrorMessage(null); }}
                            error={errors.password?.message}
                          />
                        )}
                      />

                      <Button title="Authenticate as Officer" onPress={handleSubmit(onSubmit)} loading={loading} variant="default" size="lg" style={{ marginTop: SPACING.xs }} />

                      <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      <Button title="Continue with Google" onPress={handleGoogleLogin} loading={googleLoading || loading} variant="outline" size="lg" icon={<Ionicons name="logo-google" size={18} color="#EA4335" />} />
                    </CardContent>
                  </Card>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(isOfficerSaved ? 600 : 500)}>
                  <TouchableOpacity onPress={fillDemoOfficer} style={styles.demoPillDesktop}>
                    <Ionicons name="flash" size={14} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                    <Text style={styles.demoPillTextDesktop}>Auto-fill Demo Officer</Text>
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
              <BrandBackdrop photo="bridge" opacity={.72} />
              <Animated.View entering={FadeInDown.delay(100)}>
                <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Back"
                  style={styles.backBtnMobile}
                  onPress={() => navigation.navigate('CitizenLogin')}
                >
                  <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                  <Text style={styles.backBtnTextMobile}>Citizen Portal</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200)} style={{ marginBottom: SPACING.lg }}>
                <CivicTrackLogo size="lg" showText={false} />
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(300)} style={styles.mobileTitle}>Operations Command</Animated.Text>
              <Animated.Text entering={FadeInDown.delay(400)} style={styles.mobileSubtitle}>Municipal authentication required.</Animated.Text>
              <TouchableOpacity
                onPress={() => setServerModalVisible(true)}
                style={styles.serverPillBtn}
                accessibilityRole="button"
                accessibilityLabel="Server connection settings"
              >
                <Ionicons name="server-outline" size={13} color="rgba(255,255,255,0.8)" style={{ marginRight: 5 }} />
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

              {isOfficerSaved && (
                <Animated.View entering={FadeInDown.delay(500)}>
                  <Card style={styles.savedSessionCard}>
                    <CardContent style={styles.savedSessionContent}>
                      <View style={styles.savedAvatar}>
                        <Ionicons name="shield" size={20} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedGreeting}>Remembered Officer Session</Text>
                        <Text style={styles.savedName} numberOfLines={1}>{savedSession.user.name || 'Municipal Officer'}</Text>
                        <Text style={styles.savedEmail} numberOfLines={1}>{savedSession.user.email}</Text>
                      </View>
                    </CardContent>
                    <View style={{ padding: SPACING.xl, paddingTop: 0 }}>
                      <Button title={`Resume Officer Session`} onPress={handleResumeSession} loading={resumeLoading || loading} variant="default" style={{ marginBottom: SPACING.sm }} />
                      <Button title="Use another credential" onPress={clearSavedSession} variant="ghost" />
                    </View>
                  </Card>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(isOfficerSaved ? 600 : 500)}>
                <Card>
                  <CardContent>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Department Official Email"
                          placeholder="officer@city.gov"
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
                          label="Officer Security Password"
                          placeholder="Enter security password"
                          value={value}
                          onChangeText={(text) => { onChange(text); if (errorMessage) setErrorMessage(null); }}
                          error={errors.password?.message}
                        />
                      )}
                    />

                    <Button title="Authenticate as Officer" onPress={handleSubmit(onSubmit)} loading={loading} variant="default" size="lg" style={{ marginTop: SPACING.xs }} />
                    
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <Button title="Continue with Google" onPress={handleGoogleLogin} loading={googleLoading || loading} variant="outline" size="lg" icon={<Ionicons name="logo-google" size={18} color="#EA4335" />} />
                  </CardContent>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(isOfficerSaved ? 700 : 600)}>
                <TouchableOpacity onPress={fillDemoOfficer} style={styles.demoPillDesktop}>
                  <Ionicons name="flash" size={14} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                  <Text style={styles.demoPillTextDesktop}>Auto-fill Demo Officer</Text>
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
  safeArea: { flex: 1, backgroundColor: COLORS.primaryLight },
  // Desktop
  desktopContainer: { flex: 1, flexDirection: 'row' },
  brandingSide: { flex: 1.2, backgroundColor: COLORS.primaryLight, padding: 36, justifyContent: 'center', alignItems: 'flex-start', position: 'relative', overflow: 'hidden' },
  brandingContent: { justifyContent: 'center', alignItems: 'flex-start', maxWidth: 520 },
  brandingIcon: { marginBottom: SPACING['3xl'], alignItems: 'center' },
  brandingTitle: { ...TYPOGRAPHY.display, color: COLORS.onCinematic, fontSize: 42, lineHeight: 49, marginBottom: SPACING.lg, textAlign: 'left', letterSpacing: -1.2 },
  brandingSubtitle: { ...TYPOGRAPHY.body, color: '#DDE9E4', lineHeight: 25, maxWidth: 420, textAlign: 'left' },
  brandingFooter: { position: 'absolute', bottom: SPACING['4xl'] },
  brandingFooterText: { ...TYPOGRAPHY.caption, color: COLORS.gold },
  authSide: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  authWrapper: { width: '100%', maxWidth: 460, paddingHorizontal: SPACING['3xl'], paddingVertical: SPACING['5xl'] },
  backBtnDesktop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING['4xl'], alignSelf: 'flex-start' },
  backBtnTextDesktop: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: '600', marginLeft: SPACING.xs },
  authTitle: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary, marginBottom: SPACING.md },
  authSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING['4xl'] },
  
  // Mobile
  mobileContainer: { flexGrow: 1, backgroundColor: COLORS.background, paddingBottom: SPACING['4xl'] },
  mobileHeader: { backgroundColor: COLORS.primaryLight, padding: SPACING['3xl'], paddingTop: SPACING.xl, paddingBottom: SPACING['4xl'], borderBottomLeftRadius: 20, borderBottomRightRadius: 20, alignItems: 'center', overflow: 'hidden', position: 'relative' },
  backBtnMobile: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING['3xl'], backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.xl, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  backBtnTextMobile: { ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '700', marginLeft: SPACING.xs },
  mobileTitle: { ...TYPOGRAPHY.h1, color: COLORS.onCinematic, marginBottom: SPACING.xs },
  mobileSubtitle: { ...TYPOGRAPHY.body, color: COLORS.gold },
  mobileBody: { padding: SPACING['2xl'], marginTop: -20 },

  // Shared
  serverPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  serverPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.surface,
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
  savedGreeting: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  savedName: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary },
  savedEmail: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING['2xl'] },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  dividerText: { marginHorizontal: SPACING.lg, ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  demoPillDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight, padding: 10, borderRadius: BORDER_RADIUS.md, marginTop: SPACING['3xl'] },
  demoPillTextDesktop: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontWeight: '700' }});
