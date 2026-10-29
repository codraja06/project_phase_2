import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignupSession, authApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../theme/colors';
import { Button } from '../../components/ui/Button';
import { CivicTrackLogo } from '../../components/CivicTrackLogo';

function CodeField({ label, value, onChange, disabled, onSubmit, autoFocus = false, invalid = false }: {
  label: string; value: string; onChange: (value: string) => void; disabled: boolean;
  onSubmit: () => void; autoFocus?: boolean; invalid?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <View style={s.codeField}>
    <Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label} accessibilityHint="Enter or paste the six-digit code."
      value={value} onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, 6))}
      keyboardType="number-pad" inputMode="numeric" autoComplete="one-time-code" textContentType="oneTimeCode"
      maxLength={6} autoFocus={autoFocus} returnKeyType="done" onSubmitEditing={onSubmit} editable={!disabled}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} selectTextOnFocus
      placeholder="••••••" placeholderTextColor={COLORS.textMuted} selectionColor={COLORS.primary}
      style={[s.codeInput, focused && s.codeFocused, invalid && s.codeInvalid, disabled && s.codeDisabled]} />
  </View>;
}

function Notice({ icon, title, children, tone = 'neutral' }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; children?: string; tone?: 'neutral' | 'success' | 'error';
}) {
  const color = tone === 'error' ? COLORS.errorDark : tone === 'success' ? COLORS.successDark : COLORS.textSecondary;
  return <View style={[s.notice, tone === 'error' && s.noticeError, tone === 'success' && s.noticeSuccess]}>
    <Ionicons name={icon} size={20} color={color} accessible={false} style={s.noticeIcon} />
    <View style={s.noticeContent}>
      <Text style={[s.noticeTitle, { color }]}>{title}</Text>
      {!!children && <Text accessibilityRole={tone === 'error' ? 'alert' : undefined}
        accessibilityLiveRegion="polite" style={[s.noticeBody, { color }]}>{children}</Text>}
    </View>
  </View>;
}

export function SignupVerificationScreen({ session, onSessionChange, onBack, onSignIn }: {
  session: SignupSession; onSessionChange: (session: SignupSession) => void; onBack: () => void; onSignIn?: () => void;
}) {
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const [code, setCode] = useState(''), [smsCode, setSmsCode] = useState('');
  const inFlight = useRef(false);
  const [emailVerified, setEmailVerified] = useState(false), [phoneVerified, setPhoneVerified] = useState(false);
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [signInRequired, setSignInRequired] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const cooldown = Math.max(0, Math.ceil((Date.parse(session.resendAvailableAt) - now) / 1000));
  const remaining = Math.max(0, Math.ceil((Date.parse(session.expiresAt) - now) / 1000));
  const verify = async () => {
    if (inFlight.current || signInRequired) return;
    if (!emailVerified && (code.length !== 6 || remaining === 0)) return;
    inFlight.current = true;
    setError(''); setMessage(''); setBusy(true);
    try {
      if (!emailVerified) {
        const result = await authApi.verifySignupOtp(session.challengeId, 'email', code);
        if (!result.emailVerified) throw new Error('Email verification did not complete.');
        setEmailVerified(true); setCode(''); setMessage('Email verified. Completing your registration...');
      }
      if (session.phoneVerificationRequired && smsCode.length !== 6 && !phoneVerified) throw new Error('Enter the separate SMS code to verify your phone.');
      if (smsCode && !phoneVerified) {
        const result = await authApi.verifySignupOtp(session.challengeId, 'sms', smsCode);
        if (!result.phoneVerified) throw new Error('Phone verification did not complete.');
        setPhoneVerified(true); setSmsCode('');
      }
      await register({ challengeId: session.challengeId });
    } catch (e: any) { setMessage(''); setSignInRequired(e.nextAction === 'sign_in'); setError(e.message || 'Verification failed. Please retry.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const resend = async () => {
    if (inFlight.current || cooldown > 0) return;
    inFlight.current = true;
    setError(''); setMessage(''); setBusy(true);
    try {
      const updated = await authApi.resendSignupOtp(session.challengeId);
      onSessionChange(updated); setCode(''); setSmsCode(''); setEmailVerified(false); setPhoneVerified(false); setSignInRequired(false); setNow(Date.now());
      setMessage('A new code is on its way to your inbox. Use the latest code. Check spam if it does not arrive.');
    } catch (e: any) { setError(e.message || 'The code could not be resent.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <SafeAreaView style={s.root}><KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <View style={s.card}>
        <View style={s.brand}><CivicTrackLogo size="sm" /></View>
        <View style={[s.content, width < 380 && s.compactContent]}>
          <View style={s.intro}>
            <View style={s.mailBadge}><Ionicons name={emailVerified ? 'checkmark-circle-outline' : 'mail-open-outline'} size={28} color={COLORS.primary} accessible={false} /></View>
            <Text accessibilityRole="header" style={s.title}>{session.smsStatus === 'sent' ? 'Verify your email and phone' : 'Verify your email'}</Text>
            <Text style={s.body}>{session.smsStatus === 'sent'
              ? 'Enter the separate six-digit codes sent to your email and phone to continue.'
              : 'One more step. Enter the six-digit code from your CivicTrack verification email.'}</Text>
          </View>
          {!!error && <Notice icon={signInRequired ? 'person-circle-outline' : 'alert-circle-outline'} title={signInRequired ? 'You already have an account' : 'Could not complete verification'} tone="error">{error}</Notice>}
          {!!message && <Notice icon="information-circle-outline" title="Verification update">{message}</Notice>}
          {emailVerified ? <Notice icon="checkmark-circle-outline" title="Email verified" tone="success" /> : <View style={s.entry}>
            <CodeField label="Email verification code" value={code} onChange={setCode} disabled={busy} onSubmit={verify} autoFocus invalid={!!error} />
            <View style={s.expiry}><Ionicons name="time-outline" size={15} color={remaining ? COLORS.textMuted : COLORS.errorDark} accessible={false} />
              <Text style={[s.caption, !remaining && s.expired]}>{remaining ? `Code expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Code expired. Request a new code.'}</Text>
            </View>
          </View>}
          {phoneVerified ? <Notice icon="checkmark-circle-outline" title="Phone verified" tone="success" /> : session.smsStatus === 'sent' && <View style={s.entry}>
            <CodeField label="SMS verification code" value={smsCode} onChange={setSmsCode} disabled={busy} onSubmit={verify} />
            <Text style={s.caption}>{session.phoneVerificationRequired ? 'Required. ' : 'Optional. '}Use the separate code sent to your phone.</Text>
          </View>}
          {!signInRequired && session.smsStatus === 'failed' && <Notice icon="chatbubble-outline" title={session.phoneVerificationRequired ? 'Phone verification needed' : 'You can continue with email'} tone={session.phoneVerificationRequired ? 'error' : 'neutral'}>
            {session.phoneVerificationRequired ? 'SMS delivery failed. Resend the codes before continuing.' : 'SMS could not be sent. Email verification is enough to register; your phone will remain unverified.'}
          </Notice>}
          {!signInRequired && session.smsStatus === 'not_configured' && <Notice icon="information-circle-outline" title="Email verification only">
            No SMS code was sent. Continue with email verification; your phone will remain unverified.
          </Notice>}
          <View style={s.actions}>
            {signInRequired && onSignIn ? <Button title="Go to sign in" size="lg" onPress={onSignIn} /> : <>
              <Button title={emailVerified ? 'Create account' : 'Verify and create account'} size="lg" loading={busy} disabled={busy || !emailVerified && (code.length !== 6 || remaining === 0)} onPress={verify} />
              <View style={s.resend}>
                <Text style={s.caption}>Didn’t receive a code? Check spam or</Text>
                <Button title={cooldown ? `Resend code in ${cooldown}s` : 'Resend verification code'} variant="ghost" disabled={busy || cooldown > 0} onPress={resend} textStyle={s.resendText} />
              </View>
            </>}
            <Button title="Change registration details" variant="ghost" disabled={busy} onPress={onBack} textStyle={s.backText} />
            {!!error && !signInRequired && onSignIn && <Button title="Go to sign in" variant="ghost" disabled={busy} onPress={onSignIn} />}
          </View>
        </View>
        <View style={s.footer}><Ionicons name="lock-closed-outline" size={14} color={COLORS.textMuted} accessible={false} /><Text style={s.footerText}>Keep your code private. Never share it with anyone.</Text></View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  page: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 480, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 20, overflow: 'hidden' },
  brand: { paddingVertical: 22, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  content: { padding: 28, gap: 20 }, compactContent: { padding: 20 },
  intro: { alignItems: 'center', gap: 12 },
  mailBadge: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { color: COLORS.textPrimary, fontSize: 26, lineHeight: 33, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center' },
  body: { color: COLORS.textSecondary, lineHeight: 22, fontSize: 14, textAlign: 'center' },
  entry: { gap: 10 }, codeField: { gap: 10 },
  label: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  codeInput: { width: '100%', minWidth: 0, height: 68, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    color: COLORS.textPrimary, backgroundColor: COLORS.background, textAlign: 'center', fontSize: 32, fontWeight: '600', letterSpacing: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : Platform.OS === 'android' ? 'monospace' : 'monospace',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
  codeFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight,
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 0 3px #FEE2E2' } as any : {}) },
  codeInvalid: { borderColor: COLORS.errorDark }, codeDisabled: { opacity: 0.65 },
  expiry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  caption: { color: COLORS.textMuted, fontSize: 12, lineHeight: 19, flexShrink: 1 }, expired: { color: COLORS.errorDark },
  notice: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: COLORS.backgroundNeutral, borderRadius: 12 },
  noticeIcon: { marginTop: 1 }, noticeContent: { flex: 1, minWidth: 0, gap: 4 },
  noticeTitle: { fontSize: 13, fontWeight: '600', lineHeight: 20 }, noticeBody: { fontSize: 12, lineHeight: 19 },
  noticeError: { backgroundColor: COLORS.errorLight }, noticeSuccess: { backgroundColor: COLORS.successLight },
  actions: { gap: 4 }, resend: { alignItems: 'center', paddingTop: 14 },
  resendText: { fontSize: 13 }, backText: { color: COLORS.textSecondary, fontSize: 13 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
  footerText: { flexShrink: 1, color: COLORS.textMuted, fontSize: 11, lineHeight: 17 },
});
