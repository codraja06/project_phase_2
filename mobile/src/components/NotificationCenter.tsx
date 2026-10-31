import { subscribeNotificationChanges, notifyUnreadCountChanged } from '../hooks/useUnreadCount';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { managementApi, CivicNotification } from '../api/managementApi';
import { NotificationItem } from './NotificationItem';
import { Button } from './ui/Button';
import { LoadingSpinner } from './LoadingSpinner';
import { RequestError } from './RequestError';
import { AuthorityMobileHeader } from './AuthorityMobileHeader';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { COLORS } from '../theme/colors';

const deliveryReason: Record<string, string> = {
  email_unverified: 'email is unverified', phone_unverified: 'phone is unverified',
  sms_consent_absent: 'SMS consent is needed', email_opted_out: 'email alerts are off',
  provider_not_configured: 'provider setup is needed', phone_requires_e164: 'international phone format is needed',
  delivery_outcome_unknown_manual_review: 'delivery needs administrator review', provider_rejected: 'provider did not accept the message',
};
const deliverySummary = (item: CivicNotification) => item.deliveries?.map(entry =>
  `${entry.channel === 'email' ? 'Email' : 'SMS'}: ${entry.status === 'Sent' ? 'Accepted by provider' : entry.status}${entry.errorCode ? ` (${deliveryReason[entry.errorCode] || 'delivery unavailable'})` : ''}`
).join(' · ');

export const NotificationCenter = ({ navigation, role }: { navigation: any; role: 'citizen' | 'authority' }) => {
  const { isWide } = useBreakpoint();
  const [items, setItems] = useState<CivicNotification[]>([]);
  const [page, setPage] = useState(1), [pages, setPages] = useState(1), [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (target = 1) => {
    try {
      if (target === 1) setLoading(true); else setMoreLoading(true);
      setError('');
      const data = await managementApi.getNotifications(target);
      setItems(previous => target === 1 ? data.notifications : [...previous, ...data.notifications]);
      setPage(target); setPages(data.pages); setUnread(data.unread); notifyUnreadCountChanged(data.unread);
    } catch (e: any) { setError(e.message || 'Could not load notifications.'); }
    finally { setLoading(false); setRefreshing(false); setMoreLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); return subscribeNotificationChanges(() => { void load(); }); }, [load]));

  const open = async (item: CivicNotification) => {
    try {
      if (!item.readAt) {
        const updated = await managementApi.markNotificationRead(item._id);
        setItems(previous => previous.map(entry => entry._id === item._id ? { ...entry, ...updated } : entry));
        setUnread(previous => Math.max(0, previous - 1));
      }
      navigation.navigate(role === 'authority' ? 'AuthorityComplaintDetail' : 'ComplaintDetail', { complaintId: item.complaintId });
    } catch (e: any) { setError(e.message || 'Could not open notification.'); }
  };
  if (loading && !items.length) return <LoadingSpinner message="Loading notifications…" />;
  if (error && !items.length) return <RequestError message={error} onRetry={() => load()} />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
    {role === 'authority' && !isWide && <AuthorityMobileHeader title="Notifications" />}
    <FlatList data={items} keyExtractor={item => item._id} contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 1000, width: '100%', alignSelf: 'center' }}
      ListHeaderComponent={<View style={{ marginBottom: 12 }}><Text accessibilityRole="header" style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' }}>Notifications</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>{unread} unread updates</Text>
        {!!error && <Text accessibilityRole="alert" style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text>}</View>}
      ListEmptyComponent={<Text style={{ color: COLORS.textSecondary, paddingVertical: 32 }}>No notifications yet. Complaint events will appear here.</Text>}
      ListFooterComponent={page < pages ? <Button title={moreLoading ? 'Loading…' : 'Load more'} disabled={moreLoading} onPress={() => load(page + 1)} /> : null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      renderItem={({ item }) => <NotificationItem item={{ id: item._id, title: item.title, message: item.message,
        timestamp: new Date(item.createdAt).toLocaleString(), isRead: !!item.readAt, complaintId: item.complaintId,
        resolutionDetails: item.resolution ? `${item.resolution.category.replace(/_/g, ' ')} · Resolved ${new Date(item.resolution.resolvedAt).toLocaleString()}` : undefined,
        deliverySummary: deliverySummary(item) }} onPress={() => open(item)} />} />
  </SafeAreaView>;
};
