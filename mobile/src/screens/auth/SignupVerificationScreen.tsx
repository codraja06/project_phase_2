import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignupSession, authApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../theme/colors';
import { Input } from '../../components/Input';
import { Button } from '../../components/ui/Button';
import { CivicTrackLogo } from '../../components/CivicTrackLogo';

export function SignupVerificationScreen({ session, onSessionChange, onBack, onSignIn }: {
  session: SignupSession; onSessionChange: (session: SignupSession) => void; onBack: () => void; onSignIn?: () => void;
}) {
  const { register } = useAuth();
  const [code, setCode] = useState(''), [smsCode, setSmsCode] = useState('');
  const inFlight = useRef(false);
  const [emailVerified, setEmailVerified] = useState(false), [phoneVerified, setPhoneVerified] = useState(false);
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const cooldown = Math.max(0, Math.ceil((Date.parse(session.resendAvailableAt) - now) / 1000));
  const remaining = Math.max(0, Math.ceil((Date.parse(session.expiresAt) - now) / 1000));
  const verify = async () => {
    if (inFlight.current) return;
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
    } catch (e: any) { setMessage(''); setError(e.message || 'Verification failed. Please retry.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const resend = async () => {
    if (inFlight.current || cooldown > 0) return;
    inFlight.current = true;
    setError(''); setMessage(''); setBusy(true);
    try {
      const updated = await authApi.resendSignupOtp(session.challengeId);
      onSessionChange(updated); setCode(''); setSmsCode(''); setEmailVerified(false); setPhoneVerified(false); setNow(Date.now());
      setMessage('A new verification email was accepted by the provider. Use the latest code.');
    } catch (e: any) { setError(e.message || 'The code could not be resent.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <SafeAreaView style={s.root}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <View style={s.card}><CivicTrackLogo size="sm" /><Text accessibilityRole="header" style={s.title}>{session.smsStatus === 'sent' ? 'Verify your email and phone' : 'Verify your email'}</Text>
        <Text style={s.body}>{session.smsStatus === 'sent' ? 'Check your email and phone for two separate six-digit codes. Email verification is required. Each code expires after five minutes.' : 'Enter the six-digit code from your CivicTrack verification email. Codes expire after five minutes.'}</Text>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        {!!message && <Text accessibilityLiveRegion="polite" style={s.body}>{message}</Text>}
        {emailVerified ? <Text style={s.body}>Email verified</Text> : <>
          <Input label="Email verification code" accessibilityLabel="Email verification code" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad" inputMode="numeric" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} autoFocus returnKeyType="done" onSubmitEditing={verify} editable={!busy}
            inputStyle={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }} />
          <Text style={s.body}>{remaining ? `Code expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Code expired. Request a new code.'}</Text>
        </>}
        {phoneVerified ? <Text style={s.body}>Phone verified</Text> : session.smsStatus === 'sent' && <Input label={session.phoneVerificationRequired ? 'SMS verification code' : 'SMS verification code (optional)'} accessibilityLabel="SMS verification code"
          helperText="This is a separate code. Verifying email does not verify your phone." value={smsCode} onChangeText={value => setSmsCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad" inputMode="numeric" maxLength={6} editable={!busy && !phoneVerified} />}
        {session.smsStatus === 'failed' && <Text style={s.error}>SMS delivery failed. {session.phoneVerificationRequired ? 'Resend the codes before continuing.' : 'Email verification can continue; your phone will remain unverified.'}</Text>}
        {session.smsStatus === 'not_configured' && <Text style={s.note}>SMS verification is not configured, so no code was sent to your phone. Continue with email verification; your phone will remain unverified.</Text>}
        <Button title={emailVerified ? 'Create account' : 'Verify and create account'} loading={busy} disabled={busy || !emailVerified && (code.length !== 6 || remaining === 0)} onPress={verify} />
        <Button title={cooldown ? `Resend code in ${cooldown}s` : 'Resend verification code'} variant="outline" disabled={busy || cooldown > 0} onPress={resend} />
        <Button title="Change registration details" variant="ghost" disabled={busy} onPress={onBack} />
        {!!error && onSignIn && <Button title="Go to sign in" variant="ghost" disabled={busy} onPress={onSignIn} />}
        <Text style={s.note}>Registration completes after required verification. If the final request times out, try signing in before registering again. SMS resolution alerts also require consent in notification settings.</Text>
      </View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background }, page: { flexGrow: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 500, padding: 24, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 16, gap: 16 },
  title: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '700', textAlign: 'center' }, body: { color: COLORS.textSecondary, lineHeight: 21, fontSize: 14 },
  error: { color: COLORS.errorDark, lineHeight: 21 }, note: { color: COLORS.textMuted, lineHeight: 19, fontSize: 12 },
});
