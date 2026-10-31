import { Disclosure } from './Disclosure';
import React, { useEffect, useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { managementApi, DuplicateMatch } from '../api/managementApi';
import { Complaint } from '../types/complaint';
import { selectImage } from '../services/imageSelection';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { COLORS } from '../theme/colors';
import { Button } from './ui/Button';
import { useAuth } from '../hooks/useAuth';

const section = { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderTopWidth: 1, borderTopColor: COLORS.borderLight, borderRadius: 12, padding: 18, gap: 12 } as const;
const field = { minHeight: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.textPrimary } as const;
const heading = { fontSize: 17, fontWeight: '700' as const, color: COLORS.textPrimary };
const body = { color: COLORS.textSecondary, lineHeight: 20 };

export const ComplaintManagementPanel = ({ complaint, onChange }: { complaint: Complaint; onChange: (next: Complaint) => void }) => {
  const { user } = useAuth();
  const { isWide } = useBreakpoint();
  const [triageReason, setTriageReason] = useState('');
  const [department, setDepartment] = useState(complaint.assignedDepartment || '');
  const [reason, setReason] = useState('');
  const [duplicateReason, setDuplicateReason] = useState('');
  const [candidates, setCandidates] = useState<DuplicateMatch[]>([]);
  const [candidateError, setCandidateError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setDepartment(complaint.assignedDepartment || ''); }, [complaint.assignedDepartment]);
  const run = async (action: () => Promise<Complaint>, success: string) => {
    setWorking(true); setMessage('');
    try { onChange(await action()); setMessage(success); }
    catch (e: any) { setMessage(e.message || 'Action failed. Please retry.'); }
    finally { setWorking(false); }
  };
  const chooseCompletion = async () => {
    try {
      const image = await selectImage('library');
      if (image?.uri) await run(() => managementApi.uploadCompletion(complaint._id, image.uri), 'Completion photo submitted for review.');
    } catch (e: any) { setMessage(e.message || 'Unable to select a photo.'); }
  };
  const findCandidates = async () => {
    setWorking(true); setCandidateError('');
    try { const result = await managementApi.getDuplicateCandidates(complaint._id); setCandidates(result.matches.filter(match => !!match.id)); }
    catch (e: any) { setCandidateError(e.message || 'Nearby reports could not be checked.'); }
    finally { setWorking(false); }
  };
  return <View style={{ gap: 16 }}>
    {!!message && <Text accessibilityRole="alert" style={{ color: message.includes('failed') || message.includes('Unable') ? COLORS.error : COLORS.primary }}>{message}</Text>}
    <Disclosure title="Authority triage review" summary={`Reviewed severity: ${complaint.severityReview?.level || 'Not reviewed'} · Priority: ${complaint.priorityOverride?.level || 'Calculated'}`}>
      <Text style={body}>Original AI estimate: {complaint.severity?.level || 'Unavailable'}. Experimental; requires human review.</Text>
      <Text style={body}>Reviewed severity: {complaint.severityReview?.level || 'Not reviewed'} / Priority override: {complaint.priorityOverride?.level || 'Calculated'}</Text>
      <TextInput accessibilityLabel="Triage review reason" style={field} value={triageReason} onChangeText={setTriageReason} placeholder="Explain your decision (at least 10 characters)" multiline />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['Low', 'Medium', 'High'] as const).map(level => <Button key={level} title={`Severity: ${level}`} variant="outline" disabled={working || triageReason.trim().length < 10} onPress={() => run(() => managementApi.reviewTriage(complaint._id, 'severity', level, triageReason.trim()), 'Severity review recorded.')} />)}
        {(['low', 'medium', 'high'] as const).map(level => <Button key={level} title={`Priority: ${level}`} variant="outline" disabled={working || triageReason.trim().length < 10} onPress={() => run(() => managementApi.reviewTriage(complaint._id, 'priority', level, triageReason.trim()), 'Priority override recorded.')} />)}
        <Button title="Restore calculated priority" variant="outline" disabled={working || triageReason.trim().length < 10} onPress={() => run(() => managementApi.reviewTriage(complaint._id, 'priority', null, triageReason.trim()), 'Calculated priority restored.')} />
      </View>
    </Disclosure>
    <Disclosure title="Department assignment" summary={`${complaint.assignedDepartment || 'Unassigned'}`}>
      <Text style={body}>Current: {complaint.assignedDepartment || 'Unassigned. An administrator can configure category mappings.'}</Text>
      {complaint.assignedDepartmentInfo?.verificationStatus === 'proposed' && <Text style={body}>Provisional mapping for {complaint.assignedDepartmentInfo.municipality || 'the configured municipality'}; official structure not verified.</Text>}
      {user?.isAdmin ? <><Text style={body}>Assign or reassign internally. This does not change complaint status.</Text>
      <TextInput accessibilityLabel="Department name" style={field} value={department} onChangeText={setDepartment} placeholder="Department name" />
      <TextInput accessibilityLabel="Assignment reason" style={field} value={reason} onChangeText={setReason} placeholder="Reason for assignment" />
      <Button title="Save assignment" disabled={working || department.trim().length < 2 || reason.trim().length < 5} onPress={() => run(() => managementApi.assignDepartment(complaint._id, department.trim(), reason.trim()), 'Assignment saved.')} /></> : <Text style={body}>Only administrators can change the assigned department.</Text>}
    </Disclosure>
    <Disclosure title="Related reports" summary={`${complaint.duplicateOf ? 'Duplicate relationship recorded' : 'Review nearby reports when relevant'}`}>
      <Text style={body}>{complaint.duplicateOf ? 'Authority confirmed a link to an earlier report. Both complaints remain separate records.' : 'Check same-category unresolved reports nearby before confirming a duplicate.'}</Text>
      {!!complaint.duplicateReason && <Text style={body}>Review reason: {complaint.duplicateReason}</Text>}
      {!complaint.duplicateOf && <Button title={working ? 'Checking…' : 'Check nearby reports'} variant="outline" disabled={working} onPress={findCandidates} />}
      {!!candidateError && <Text accessibilityRole="alert" style={{ color: COLORS.error }}>{candidateError}</Text>}
      {candidates.length === 0 && !candidateError && <Text style={body}>No candidates loaded.</Text>}
      {candidates.length > 0 && !complaint.duplicateOf && <>
        <TextInput accessibilityLabel="Reason for duplicate confirmation" style={field} value={duplicateReason} onChangeText={setDuplicateReason} placeholder="Explain why these refer to the same issue" multiline />
        {candidates.map(match => <View key={String(match.id)} style={{ borderTopWidth: 1, borderColor: COLORS.borderLight, paddingTop: 8, gap: 6 }}>
          <Text style={body}>{match.complaintId} · about {match.distanceMeters} m · {match.status} / {match.imageComparison === 'similar' ? 'Visual similarity supported' : 'Image comparison unavailable; manual review required'}</Text>
          <Button title={`Confirm duplicate of ${match.complaintId}`} variant="outline" disabled={working || duplicateReason.trim().length < 10} onPress={() => run(() => managementApi.confirmDuplicate(complaint._id, String(match.id), duplicateReason.trim()), 'Duplicate link confirmed.')} />
        </View>)}
      </>}
    </Disclosure>
    <View style={section}>
      <Text style={heading}>Repair evidence</Text>
      <Text style={body}>Original and completion photos support human review. Uploading does not resolve a complaint.</Text>
      {complaint.completionImageUrl ? <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 10 }}>
        <View style={{ flex: 1 }}><Text style={body}>Before</Text><Image source={{ uri: complaint.imageUrl }} accessibilityLabel="Original complaint photo" style={{ width: '100%', height: 180, resizeMode: 'contain', backgroundColor: COLORS.backgroundNeutral }} /></View>
        <View style={{ flex: 1 }}><Text style={body}>After · {complaint.completionReview || 'pending review'}</Text><Image source={{ uri: complaint.completionImageUrl }} accessibilityLabel="Submitted completion photo" style={{ width: '100%', height: 180, resizeMode: 'contain', backgroundColor: COLORS.backgroundNeutral }} /></View>
      </View> : <Text style={body}>No completion photo submitted.</Text>}
      {complaint.status === 'In Progress' && <Button title={complaint.completionImageUrl ? 'Replace completion photo' : 'Upload completion photo'} variant="outline" disabled={working} onPress={chooseCompletion} />}
      {complaint.completionReview === 'pending' && <>
        <TextInput accessibilityLabel="Repair evidence review note" style={field} value={reviewNote} onChangeText={setReviewNote} placeholder="Review note (required for rejection)" multiline />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button title="Accept evidence" disabled={working} onPress={() => run(() => managementApi.reviewCompletion(complaint._id, 'accepted', reviewNote), 'Evidence accepted. Resolve only after confirming completed work.')} />
          <Button title="Reject evidence" variant="outline" disabled={working || reviewNote.trim().length < 10} onPress={() => run(() => managementApi.reviewCompletion(complaint._id, 'rejected', reviewNote.trim()), 'Evidence rejected.')} />
        </View>
      </>}
      {!!complaint.completionReviewNote && <Text style={body}>Review note: {complaint.completionReviewNote}</Text>}
      {complaint.statusHistory?.length ? <View style={{ gap: 3 }}><Text style={body}>Recorded status history</Text>{complaint.statusHistory.map((event, index) => <Text key={`${index}-${event.at}`} style={body}>{event.status} · {new Date(event.at).toLocaleString()}</Text>)}</View> : null}
    </View>
    {!!complaint.auditHistory?.length && <Disclosure title="Decision history">{complaint.auditHistory.slice().reverse().map((event, index) => <Text key={`${index}-${event.at}`} style={body}>{event.action}: {event.before || '-'} to {event.after || '-'} / {new Date(event.at).toLocaleString()} / {event.by || 'Configured routing rule'} / {event.reason}</Text>)}</Disclosure>}
  </View>;
};
