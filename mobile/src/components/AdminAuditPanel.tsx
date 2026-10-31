import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { axiosClient } from '../api/axiosClient';
import { Button } from './ui/Button';
import { PAGE } from '../theme/layout';
import { COLORS } from '../theme/colors';

export const AdminAuditPanel = () => {
  const [actor, setActor] = useState(''), [complaint, setComplaint] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState('');
  const [action, setAction] = useState(''), [department, setDepartment] = useState('');
  const [records, setRecords] = useState<any[]>([]), [page, setPage] = useState(1), [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('Select Load audit records to view recorded activity.');
  const load = async (target = 1) => {
    setBusy(true);
    try {
      const result: any = await axiosClient.get('/admin/audit', { params: { user: actor || undefined, complaint: complaint || undefined, from: from ? `${from}T00:00:00.000Z` : undefined, to: to ? `${to}T23:59:59.999Z` : undefined, action: action || undefined, department: department || undefined, page: target } });
      setRecords(result.data.records); setPage(result.data.page); setPages(result.data.pages); setMessage(`${result.data.total} recorded events. New events may take a few seconds to appear.`);
    } catch (e: any) { setMessage(e.message || 'Audit records could not be loaded.'); }
    finally { setBusy(false); }
  };
  return <View style={PAGE.section}>
    <Text style={PAGE.body}>Administrator access only. Records contain operational changes; passwords, codes and authentication tokens are excluded.</Text>
    <TextInput accessibilityLabel="Audit action filter" placeholder="Action, e.g. status-updated" value={action} onChangeText={setAction} style={{ minHeight: 44, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }} />
    <TextInput accessibilityLabel="Audit department filter" placeholder="Exact department name" value={department} onChangeText={setDepartment} style={{ minHeight: 44, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }} />
    {[{ label: 'Audit user ID', value: actor, set: setActor, placeholder: 'Exact user ID (optional)' }, { label: 'Audit complaint ID', value: complaint, set: setComplaint, placeholder: 'MongoDB complaint ID (optional)' }, { label: 'Audit start date', value: from, set: setFrom, placeholder: 'From YYYY-MM-DD (UTC)' }, { label: 'Audit end date', value: to, set: setTo, placeholder: 'To YYYY-MM-DD (UTC)' }].map(field => <TextInput key={field.label} accessibilityLabel={field.label} placeholder={field.placeholder} value={field.value} onChangeText={field.set} style={{ minHeight: 44, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }} />)}
    <Button title="Load audit records" disabled={busy} onPress={() => load()} />
    <Text accessibilityLiveRegion="polite" style={PAGE.body}>{message}</Text>
    {records.map(record => <View key={record._id} style={{ borderTopWidth: 1, borderColor: COLORS.borderLight, paddingTop: 12, gap: 4 }}><Text style={PAGE.heading}>{record.action.replace(/-/g, ' ')}</Text><Text selectable style={PAGE.body}>{record.entity} · {record.entityId}</Text><Text style={PAGE.body}>{record.role} · {new Date(record.at).toLocaleString()} · {record.department || 'No department'}</Text><Text selectable style={PAGE.body}>Before: {JSON.stringify(record.before)}{ '\n' }After: {JSON.stringify(record.after)}</Text></View>)}
    <View style={PAGE.row}><Button title="Previous audit page" variant="outline" disabled={busy || page <= 1} onPress={() => load(page - 1)} /><Text style={PAGE.body}>{page} / {pages}</Text><Button title="Next audit page" variant="outline" disabled={busy || page >= pages} onPress={() => load(page + 1)} /></View>
  </View>;
};
