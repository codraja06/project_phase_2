import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { managementApi, DepartmentRule } from '../api/managementApi';
import { COLORS } from '../theme/colors';
import { Button } from './ui/Button';

const input = { minHeight: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.textPrimary, flexGrow: 1, minWidth: 150 } as const;
export const DepartmentMappingManager = () => {
  const [rules, setRules] = useState<DepartmentRule[]>([]), [category, setCategory] = useState(''), [department, setDepartment] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [municipality, setMunicipality] = useState(''), [sourceNote, setSourceNote] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'proposed' | 'verified'>('proposed');
  const load = async () => { try { setRules(await managementApi.getDepartments()); setError(''); } catch (e: any) { setError(e.message || 'Mappings unavailable.'); } };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    setBusy(true);
    try { await managementApi.saveDepartment(category.trim().toLowerCase(), department.trim(), true,
      {municipality,sourceNote,verificationStatus}); setCategory(''); setDepartment(''); setSourceNote(''); setMunicipality(''); setVerificationStatus('proposed'); await load(); }
    catch (e: any) { setError(e.message || 'Could not save mapping.'); }
    finally { setBusy(false); }
  };
  return <View style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, borderTopWidth: 3, borderTopColor: COLORS.gold, borderRadius: 12, padding: 18, gap: 12 }}>
    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary }}>Department routing rules</Text>
    <Text style={{ color: COLORS.textSecondary }}>Administrator-managed local mappings. New reports use the matching active rule. Existing assignments remain unchanged until an officer reassigns them.</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: COLORS.error }}>{error}</Text>}
    {rules.length ? rules.map(rule => <View key={rule.category} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: COLORS.textPrimary, flexGrow: 1 }}>{rule.category.replace(/_/g, ' ')} → {rule.department}{rule.enabled ? '' : ' (disabled)'}</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{rule.municipality || 'Local configuration'} · {rule.verificationStatus === 'verified' ? 'Administrator verified' : 'Proposed · official structure not verified'}</Text>
      <Button title="Edit" accessibilityLabel={`Edit mapping for ${rule.category}`} variant="outline" size="sm" disabled={busy} onPress={()=>{
        setCategory(rule.category);setDepartment(rule.department);setMunicipality(rule.municipality||'');setSourceNote(rule.sourceNote||'');setVerificationStatus(rule.verificationStatus||'proposed');
      }} />
      <Button title={rule.enabled ? 'Disable' : 'Enable'} variant="outline" size="sm" disabled={busy} onPress={async () => {
        setBusy(true); try { await managementApi.saveDepartment(rule.category, rule.department, !rule.enabled); await load(); }
        catch (e: any) { setError(e.message || 'Could not update mapping.'); } finally { setBusy(false); }
      }} />
    </View>) : <Text style={{ color: COLORS.textSecondary }}>No mappings configured. New reports will remain unassigned.</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <TextInput accessibilityLabel="Issue category mapping" style={input} placeholder="Category key, e.g. pothole" value={category} autoCapitalize="none" onChangeText={setCategory} />
      <TextInput accessibilityLabel="Department mapping name" style={input} placeholder="Department name" value={department} onChangeText={setDepartment} />
    </View>
    <TextInput accessibilityLabel="Mapping municipality" style={input} placeholder="Municipality (optional)" value={municipality} onChangeText={setMunicipality} />
    <Text style={{color:COLORS.textSecondary}}>Verification: {verificationStatus === 'verified' ? 'Administrator verified with a source' : 'Proposed, awaiting official verification'}</Text>
    <Button title={verificationStatus === 'verified' ? 'Keep as proposed' : 'Mark verified with source'} variant="outline" disabled={busy} onPress={()=>setVerificationStatus(verificationStatus==='verified'?'proposed':'verified')} />
    <TextInput accessibilityLabel="Mapping verification source" style={input} placeholder="Official source or verification note" value={sourceNote} onChangeText={setSourceNote} multiline />
    <Button title={busy ? 'Saving…' : 'Save routing rule'} disabled={busy || category.trim().length < 2 || department.trim().length < 2 || verificationStatus==='verified' && sourceNote.trim().length<10} onPress={save} />
  </View>;
};
