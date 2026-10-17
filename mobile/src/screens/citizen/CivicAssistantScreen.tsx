import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Image, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { chatApi, Conversation } from '../../api/chatApi';
import { COLORS } from '../../theme/colors';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Button } from '../../components/ui/Button';
import { CIVIC_PHOTOS } from '../../components/CivicVisuals';

const prompts = ['How do I report an issue?', 'What do complaint statuses mean?', 'How should I take the photo?', 'Which categories are supported?'];
export const CivicAssistantScreen = ({ navigation }: any) => {
  const { isDesktop } = useBreakpoint();
  const [conversation, setConversation] = useState<Conversation>({ messages: [] });
  const [input, setInput] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true), [sending, setSending] = useState(false);
  const [failedMessage, setFailedMessage] = useState('');
  const scroll = useRef<ScrollView>(null), inFlight = useRef(false);
  const load = async () => {
    try { setLoading(true); setError(''); setConversation(await chatApi.getConversation()); }
    catch (e: any) { setError(e.message || 'Conversation could not be loaded.'); }
    finally { setLoading(false); }
  };
  useFocusEffect(useCallback(() => { void load(); }, []));
  const send = async (text = input) => {
    if (!text.trim() || inFlight.current) return;
    inFlight.current = true; setSending(true); setError(''); setFailedMessage('');
    try {
      const result = await chatApi.send(text.trim(), conversation._id);
      setConversation(result.conversation); setNotice(result.notice); setInput('');
    } catch (e: any) { setError(e.message || 'Message could not be sent. Your text has been kept.'); setFailedMessage(text); }
    finally { inFlight.current = false; setSending(false); }
  };
  return <SafeAreaView style={styles.root}>
    <View style={styles.header}>
      <View style={{ flex: 1 }}><Text style={styles.title}>Civic Assistance</Text><Text style={styles.subtitle}>Guidance for your next step</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Exit civic assistance" style={styles.exit} onPress={() => navigation.navigate('CitizenDashboard')}><Ionicons name="close-outline" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
    </View>
    <View style={[styles.workspace, isDesktop && { flexDirection: 'row' }]}>
      {isDesktop && <View style={styles.guide}>
        <Image source={CIVIC_PHOTOS.bridge} accessible={false} style={{ width: '100%', height: 150, borderRadius: 12 }} resizeMode="cover" />
        <View style={styles.guideIcon}><Ionicons name="chatbubbles-outline" size={28} color={COLORS.primary} /></View>
        <Text style={styles.guideTitle}>{'A little guidance.\nA clearer report.'}</Text>
        <Text style={styles.guideText}>Ask about reporting, photos, categories, or a complaint in your own account. Include its CIV reference for the recorded status.</Text>
        <Button title="Report an issue" onPress={() => navigation.navigate('ReportIssue')} />
        <Button title="Open My Complaints" variant="outline" onPress={() => navigation.navigate('ComplaintHistory')} />
        <Text style={styles.guideText}>Read-only assistance. Authorities control verification and status updates.</Text>
      </View>}
      <KeyboardAvoidingView style={styles.conversation} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={styles.messages} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })} keyboardShouldPersistTaps="handled">
          {loading ? <ActivityIndicator accessibilityLabel="Loading conversation" color={COLORS.primary} /> : <>
            {!conversation.messages.length && <View style={styles.empty}>
              {!isDesktop && <Image source={CIVIC_PHOTOS.bridge} accessible={false} style={{ width: '100%', height: 110, borderRadius: 10 }} resizeMode="cover" />}
              <Ionicons name="chatbubbles-outline" size={32} color={COLORS.primary} /><Text style={styles.emptyTitle}>How can we help?</Text>
              <Text style={styles.guideText}>Choose a question or write your own. AI availability depends on the configured provider; factual built-in guidance remains available.</Text>
              {prompts.map(prompt => <Button key={prompt} title={prompt} variant="outline" onPress={() => send(prompt)} disabled={sending} />)}
            </View>}
            {conversation.messages.map((message, index) => <View key={`${message.createdAt}-${index}`} style={[styles.message, message.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
              <Text style={styles.sender}>{message.role === 'user' ? 'You' : message.source === 'guide' ? 'Built-in civic guide' : message.source === 'application' ? 'Your complaint record' : 'Civic assistant'}</Text>
              <Text selectable style={styles.messageText}>{message.content}</Text>
            </View>)}
          </>}
          {sending && <View accessibilityLiveRegion="polite" style={styles.pending}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={styles.subtitle}>Preparing guidance…</Text></View>}
        </ScrollView>
        {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
        {!!error && <View accessibilityRole="alert" style={styles.error}><Text style={styles.errorText}>{error}</Text><Button title="Retry" variant="outline" size="sm" onPress={() => failedMessage ? send(failedMessage) : load()} disabled={sending} /></View>}
        <View style={styles.composer}>
          <TextInput accessibilityLabel="Message to civic assistant" placeholder="Ask about reporting or include your CIV reference" placeholderTextColor={COLORS.textMuted}
            value={input} onChangeText={setInput} multiline maxLength={2000} style={styles.input} editable={!sending && !loading} />
          <Button accessibilityLabel="Send message" title="Send" onPress={() => send()} loading={sending} disabled={loading || !input.trim()} />
        </View>
        <View style={styles.footer}><Text style={styles.footerText}>Only your complaints. No status changes.</Text><Button title="New chat" variant="ghost" size="sm" disabled={sending || loading} onPress={() => { setConversation({ messages: [] }); setNotice(''); setError(''); }} /></View>
      </KeyboardAvoidingView>
    </View>
  </SafeAreaView>;
};
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background }, header: { padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  title: { fontSize: 22, color: COLORS.textPrimary, fontWeight: '700' }, subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 5 }, exit: { height: 44, width: 44, justifyContent: 'center', alignItems: 'center' },
  workspace: { flex: 1, padding: 16, gap: 24, minHeight: 0 }, guide: { width: 280, padding: 12, gap: 18 }, guideIcon: { height: 60, width: 60, borderRadius: 14, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  guideTitle: { fontSize: 26, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 34 }, guideText: { fontSize: 14, lineHeight: 22, color: COLORS.textSecondary },
  conversation: { flex: 1, minHeight: 0, minWidth: 0, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, overflow: 'hidden' },
  messages: { flexGrow: 1, padding: 16, gap: 16 }, empty: { gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center', paddingVertical: 12 }, emptyTitle: { fontSize: 22, color: COLORS.textPrimary, fontWeight: '600' },
  message: { maxWidth: '95%', padding: 16, borderRadius: 12, gap: 7 }, userMessage: { alignSelf: 'flex-end', backgroundColor: COLORS.primaryLight }, assistantMessage: { alignSelf: 'flex-start', backgroundColor: COLORS.backgroundNeutral },
  sender: { fontSize: 11, color: COLORS.primaryDark, fontWeight: '700' }, messageText: { fontSize: 15, lineHeight: 23, color: COLORS.textPrimary }, pending: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  notice: { fontSize: 12, lineHeight: 18, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.textSecondary, backgroundColor: COLORS.infoLight },
  composer: { padding: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, input: { flex: 1, minWidth: 0, minHeight: 48, maxHeight: 130, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.textPrimary },
  footer: { paddingHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }, footerText: { color: COLORS.textMuted, fontSize: 11 },
  error: { padding: 12, gap: 8, backgroundColor: COLORS.errorLight }, errorText: { color: COLORS.errorDark, fontSize: 13, lineHeight: 19 },
});
