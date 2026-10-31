import { Disclosure } from '../../components/Disclosure';
import { RequestError } from '../../components/RequestError';
import { TriageSummary } from '../../components/TriageSummary';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown, FadeInUp, Layout, ZoomIn, FadeOut } from 'react-native-reanimated';
import { authorityApi } from '../../api/authorityApi';
import { Complaint } from '../../types/complaint';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useMobileMenu } from '../../contexts/MobileMenuContext';
import { SearchBar } from '../../components/SearchBar';
import { FilterChipGroup } from '../../components/FilterChip';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Toast } from '../../components/Toast';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AuthorityMobileHeader } from '../../components/AuthorityMobileHeader';

const formatCategory = (cat?: string) => {
  if (!cat) return 'Unspecified';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// ─── Desktop Administrative Table Row Component ──────────────────────────────
interface TableRowProps {
  complaint: Complaint;
  onPress: () => void;
  onVerify: (complaint: Complaint) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const DesktopComplaintRow: React.FC<TableRowProps> = ({
  complaint,
  onPress,
  onVerify,
  isSelected,
  onToggleSelect,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isWeb = Platform.OS === 'web';

  const formattedDate = new Date(complaint.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  const citizenObj = complaint.createdBy || complaint.citizenId;
  const citizenName =
    typeof citizenObj === 'object' && citizenObj
      ? (citizenObj as any).name || 'Citizen'
      : 'Citizen';
  const citizenContact =
    typeof citizenObj === 'object' && citizenObj
      ? (citizenObj as any).phone || (citizenObj as any).email || ''
      : '';

  const complaintCode = complaint.complaintId || `#CIV${complaint._id.slice(-5).toUpperCase()}`;
  const priority = complaint.priority || 'medium';
  const isHighPriority = priority === 'urgent' || priority === 'high';
  const isVerified = Boolean(complaint.verified);

  const aiLabel = complaint.aiClass
    ? formatCategory(complaint.aiClass)
    : complaint.boundingBoxes && complaint.boundingBoxes.length > 0
    ? formatCategory((complaint.boundingBoxes[0] as any).className || (complaint.boundingBoxes[0] as any).label)
    : 'None';

  const userCategoryLabel = complaint.customCategory
    ? complaint.customCategory
    : formatCategory(complaint.category);

  return (
    <View
      style={[
        styles.tableRow,
        isSelected && styles.tableRowSelected,
        isHovered && isWeb && (styles.tableRowHovered as any),
      ]}
      {...({
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      } as any)}
    >
      <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Select ${complaintCode}`} accessibilityState={{ checked: !!isSelected }} onPress={onToggleSelect} style={styles.tableCheckboxBtn} activeOpacity={0.8}>
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={18}
          color={isSelected ? COLORS.authorityPrimary : COLORS.textMuted}
        />
      </TouchableOpacity>

      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.tableThumbWrapper}>
        <View style={styles.tableThumb}>
          {complaint.imageUrl && !imgError ? (
            <Image
              source={{ uri: complaint.imageUrl }}
              style={styles.tableThumbImg}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.tableThumbPlaceholder}>
              <Ionicons name="image-outline" size={20} color={COLORS.textMuted} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tableColTitle} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.civRow}>
          <Text style={styles.complaintCodeText}>{complaintCode}</Text>
          {isVerified ? (
            <Badge label="VERIFIED" variant="default" icon={<Ionicons name="shield-checkmark" size={10} color="#FFF" />} />
          ) : (
            <Badge label="UNVERIFIED" variant="outline" />
          )}
        </View>
        <Text style={styles.tableTitle} numberOfLines={1}>
          {complaint.title}
        </Text>
        <TriageSummary severity={complaint.severity} severityReview={complaint.severityReview} priority={complaint.priority} compact />

      </TouchableOpacity>

      <View style={styles.tableColComparison}><Text style={styles.tableDate}>{userCategoryLabel}</Text></View>
      <View style={styles.tableColCitizen}><Text style={styles.tableDate} numberOfLines={2}>{complaint.address || 'Location recorded'}</Text></View>

      <View style={styles.tableColDate}>
        <Text style={styles.tableDate}>{formattedDate}</Text>
      </View>

      <View style={styles.tableColStatus}>
        <StatusBadge status={complaint.status} size="sm" />
      </View>

      <View style={styles.tableColActions}>
        {!isVerified && (
          <Button title="Verify" variant="outline" onPress={() => onVerify(complaint)} size="sm" style={{ marginRight: SPACING.xs, height: 32, paddingHorizontal: SPACING.sm }} />
        )}
        <Button accessibilityLabel={`View details for ${complaintCode}`} variant="ghost" onPress={onPress} size="sm" style={{ width: 32, height: 32, paddingHorizontal: 0 }} icon={<Ionicons name="chevron-forward" size={16} color={COLORS.textPrimary} />} />
      </View>
    </View>
  );
};

// ─── Mobile Administrative Complaint Card ────────────────────────────────────
interface MobileCardProps {
  complaint: Complaint;
  onPress: () => void;
  onVerify: (complaint: Complaint) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const MobileAuthorityCard: React.FC<MobileCardProps> = ({
  complaint,
  onPress,
  onVerify,
  isSelected,
  onToggleSelect,
}) => {
  const [imgError, setImgError] = useState(false);

  const formattedDate = new Date(complaint.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const citizenObj = complaint.createdBy || complaint.citizenId;
  const citizenName =
    typeof citizenObj === 'object' && citizenObj
      ? (citizenObj as any).name || 'Citizen'
      : 'Citizen';
  const citizenContact =
    typeof citizenObj === 'object' && citizenObj
      ? (citizenObj as any).phone || (citizenObj as any).email || ''
      : '';

  const complaintCode = complaint.complaintId || `#CIV${complaint._id.slice(-5).toUpperCase()}`;
  const priority = complaint.priority || 'medium';
  const isHighPriority = priority === 'urgent' || priority === 'high';
  const isVerified = Boolean(complaint.verified);

  const aiLabel = complaint.aiClass
    ? formatCategory(complaint.aiClass)
    : complaint.boundingBoxes && complaint.boundingBoxes.length > 0
    ? formatCategory((complaint.boundingBoxes[0] as any).className || (complaint.boundingBoxes[0] as any).label)
    : 'None detected';

  const userCategoryLabel = complaint.customCategory
    ? `${complaint.customCategory} (Custom)`
    : formatCategory(complaint.category);

  return (
    <Card style={[styles.mobileCard, isSelected && styles.mobileCardSelected]}>
      <CardContent style={{ padding: SPACING.lg }}>
        <View style={styles.mobileCardHeader}>
          <View style={styles.mobileCardHeaderLeft}>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Select ${complaintCode}`} accessibilityState={{ checked: !!isSelected }} onPress={onToggleSelect} style={styles.mobileCheckboxBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? COLORS.authorityPrimary : COLORS.textMuted} />
            </TouchableOpacity>
            <Text style={styles.complaintCodeText}>{complaintCode}</Text>
            {isVerified ? <Badge label="VERIFIED" variant="default" /> : <Badge label="UNVERIFIED" variant="outline" />}
          </View>
          <StatusBadge status={complaint.status} size="sm" />
        </View>

        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.mobileCardBody}>
          {complaint.imageUrl && !imgError ? (
            <Image source={{ uri: complaint.imageUrl }} style={styles.mobileCardImg} resizeMode="cover" onError={() => setImgError(true)} />
          ) : (
            <View style={styles.mobileCardImgPlaceholder}>
              <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
            </View>
          )}

          <View style={styles.mobileCardContent}>
            <Text style={styles.mobileCardTitle} numberOfLines={2}>{complaint.title}</Text>
            <Text style={styles.mobileCardLocation} numberOfLines={1}>{complaint.address || 'GPS Coordinates logged'}</Text>
            <Text style={styles.mobileCardCitizen} numberOfLines={1}>{citizenName} {citizenContact ? `(${citizenContact})` : ''}</Text>
          </View>
        </TouchableOpacity>

        <TriageSummary severity={complaint.severity} severityReview={complaint.severityReview} priority={complaint.priority} compact />
        <Text style={styles.mobileCardLocation} numberOfLines={3}>{complaint.description}</Text>
        <View style={styles.mobileCompareBanner}>
          <View style={styles.mobileCompareCol}>
            <Text style={styles.mobileCompareLabel}>AI PREDICTION</Text>
            <Text style={styles.mobileCompareValue} numberOfLines={1}>{aiLabel}</Text>
          </View>
          <View style={styles.mobileCompareDivider} />
          <View style={styles.mobileCompareCol}>
            <Text style={styles.mobileCompareLabel}>USER CATEGORY</Text>
            <Text style={styles.mobileCompareValue} numberOfLines={1}>{userCategoryLabel}</Text>
          </View>
        </View>

        <View style={styles.mobileCardFooter}>
          <Text style={styles.mobileCardDate}>{formattedDate}</Text>
          <View style={styles.mobileActionGroup}>
            {!isVerified && (
              <Button title="Verify" variant="outline" onPress={() => onVerify(complaint)} size="sm" style={{ height: 32, paddingHorizontal: SPACING.sm }} />
            )}
            <Button title="Dossier" variant="secondary" onPress={onPress} size="sm" style={{ height: 32 }} icon={<Ionicons name="chevron-forward" size={14} color={COLORS.textPrimary} />} />
          </View>
        </View>
      </CardContent>
    </Card>
  );
};

// ─── Main Screen Component ───────────────────────────────────────────────────
export const AuthorityComplaintsScreen = ({ navigation, route }: any) => {
  const fetchRequest = useRef(0);
  const { toggleMenu } = useMobileMenu();
  const { isDesktop, isMobile } = useBreakpoint();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(route?.params?.search || '');
  const [appliedSearch, setAppliedSearch] = useState(searchQuery);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 25 });
  const initialFilter = route?.params?.filter || 'all';
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter === 'urgent' ? 'all' : initialFilter);
  const [priorityFilter, setPriorityFilter] = useState(initialFilter === 'urgent' ? 'high' : 'all');
  const [sortBy, setSortBy] = useState('priority');


  useEffect(() => { const timer = setTimeout(() => setAppliedSearch(searchQuery), 300); return () => clearTimeout(timer); }, [searchQuery]);
  useEffect(() => { setPage(1); }, [priorityFilter, sortBy, statusFilter, appliedSearch, route?.params?.from, route?.params?.to, route?.params?.category, route?.params?.department, route?.params?.overdue]);
  useEffect(() => { setSearchQuery(route?.params?.search || ''); }, [route?.params?.search]);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    if (route?.params?.filter) {
      setStatusFilter(route.params.filter === 'urgent' ? 'all' : route.params.filter);
      setPriorityFilter(route.params.filter === 'urgent' ? 'high' : 'all');
    }
  }, [route?.params?.filter]);

  useFocusEffect(
    React.useCallback(() => {
      fetchComplaints();
    }, [route?.params?.filter, priorityFilter, sortBy, page, statusFilter, appliedSearch, route?.params?.from, route?.params?.to, route?.params?.category, route?.params?.department, route?.params?.overdue])
  );

  const fetchComplaints = async () => {
    const request = ++fetchRequest.current;
    try {
      setLoading(true); setLoadError('');
      const date = new Date().toISOString().slice(0, 10);
      const res = await authorityApi.getAllComplaints({ priority: priorityFilter, sortBy, page, limit: 25,
        status: ['all','today'].includes(statusFilter) ? undefined : statusFilter, search: appliedSearch, category: route?.params?.category, department: route?.params?.department, overdue: route?.params?.overdue,
        from: statusFilter === 'today' ? date : route?.params?.from, to: statusFilter === 'today' ? date : route?.params?.to });
      if (request !== fetchRequest.current) return;
      setComplaints(res.complaints || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: res.complaints.length, limit: 25 });
    } catch (error) {
      if (request === fetchRequest.current) setLoadError((error as Error).message || 'Please check your connection and retry.');
    } finally {
      if (request === fetchRequest.current) { setLoading(false); setRefreshing(false); }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const handleVerify = async (item: Complaint) => {
    try {
      await authorityApi.verifyComplaint(item._id);
      setComplaints((prev) => prev.map((c) => (c._id === item._id ? { ...c, verified: true } : c)));
      setToast({ visible: true, message: `Incident verified.`, type: 'success' });
    } catch (error: any) {
      setToast({ visible: true, message: error.message || 'Unable to verify complaint.', type: 'error' });
    }
  };



  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (statusFilter === 'today') {
        if (new Date(c.createdAt).toDateString() !== new Date().toDateString()) return false;
      } else if (statusFilter === 'urgent') {
        const isUrgent = c.priority === 'urgent' || c.priority === 'high';
        if (!isUrgent) return false;
      } else if (statusFilter !== 'all') {
        const s = (c.status || '').toLowerCase().replace(' ', '_');
        if (s !== statusFilter) return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesCode = (c.complaintId || '').toLowerCase().includes(q);
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesDesc = c.description?.toLowerCase().includes(q);
        const matchesCat = c.category?.toLowerCase().includes(q);
        const matchesAddr = c.address?.toLowerCase().includes(q);
        const userObj = c.createdBy || c.citizenId;
        const matchesCitizen = typeof userObj === 'object' && (userObj as any)?.name?.toLowerCase()?.includes(q);
        if (!matchesCode && !matchesTitle && !matchesDesc && !matchesCat && !matchesAddr && !matchesCitizen) return false;
      }
      return true;
    });
  }, [complaints, statusFilter, searchQuery]);

  const statusOptions = [
    { label: 'Today', value: 'today' }, { label: 'All Incidents', value: 'all' },
    { label: 'Pending', value: 'pending' }, { label: 'In Progress', value: 'in_progress' }, { label: 'Resolved', value: 'resolved' },
  ];
  const paginationControls = <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
    <Button title="Previous page" variant="outline" size="sm" disabled={loading || page <= 1} onPress={() => { setSelectedIds([]); setPage(page - 1); }} />
    <Text style={styles.tableDate}>Page {pagination.page} of {pagination.pages} · {pagination.total} reports</Text>
    <Button title="Next page" variant="outline" size="sm" disabled={loading || page >= pagination.pages} onPress={() => { setSelectedIds([]); setPage(page + 1); }} />
  </View>;
  const priorityControls = <View>
    {(route?.params?.department || route?.params?.overdue || route?.params?.from || route?.params?.to || (route?.params?.category && route.params.category !== 'all')) && <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Text style={styles.tableDate}>Date range: {route?.params?.from || 'Any'} to {route?.params?.to || 'Any'} · Category: {route?.params?.category || 'All'}</Text>
      <Button title="Clear date/category filters" variant="ghost" size="sm" onPress={() => navigation.setParams({ from: undefined, to: undefined, category: undefined, department: undefined, overdue: undefined })} />
    </View>}
    <Text style={styles.tableDate}>Priority</Text>
    <FilterChipGroup options={[
      { label: 'All priorities', value: 'all' }, { label: 'High Priority', value: 'high' },
      { label: 'Medium Priority', value: 'medium' }, { label: 'Low Priority', value: 'low' },
    ]} selectedValue={priorityFilter} onSelect={setPriorityFilter} />
    <Text style={styles.tableDate}>Sort complaints</Text>
    <FilterChipGroup options={[
      { label: 'Priority first', value: 'priority' }, { label: 'Newest first', value: 'newest' },
      { label: 'Oldest first', value: 'oldest' },
    ]} selectedValue={sortBy} onSelect={setSortBy} />
  </View>;

  const EmptyComponent = (
    <Animated.View entering={ZoomIn.delay(300)} style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="documents-outline" size={42} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No complaints found</Text>
      <Text style={styles.emptySub}>{searchQuery ? 'Try another search query' : 'No records match the selected status filter'}</Text>
    </Animated.View>
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredComplaints.length && filteredComplaints.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredComplaints.map((c) => c._id));
    }
  };

  const handleBulkStatus = async (newStatus: 'In Progress' | 'Resolved') => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      const results = await Promise.allSettled(selectedIds.map(id => authorityApi.updateComplaintStatus(id, newStatus)));
      const successes = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      const failedIds = selectedIds.filter((id,index) => results[index].status === 'rejected');
      setComplaints(prev => prev.map(c => successes.find(updated => updated._id === c._id) || c));
      setSelectedIds(failedIds);
      setToast({ visible: true, message: `${successes.length} updated; ${failedIds.length} failed.`, type: failedIds.length ? 'error' : 'success' });
    } catch (error: any) {
      setToast({ visible: true, message: error.message || 'Bulk status update failed.', type: 'error' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      const results = await Promise.allSettled(selectedIds.map(id => authorityApi.verifyComplaint(id)));
      const successes = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      const failedIds = selectedIds.filter((id,index) => results[index].status === 'rejected');
      setComplaints(prev => prev.map(c => successes.find(updated => updated._id === c._id) || c));
      setSelectedIds(failedIds);
      setToast({ visible: true, message: `${successes.length} verified; ${failedIds.length} failed.`, type: failedIds.length ? 'error' : 'success' });
    } catch (error: any) {
      setToast({ visible: true, message: error.message || 'Bulk verification failed.', type: 'error' });
    } finally {
      setBulkLoading(false);
    }
  };

  const renderBulkBar = () => {
    if (filteredComplaints.length === 0) return null;
    return (
      <View style={styles.bulkToolbar}>
        <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Select all complaints on this page" accessibilityState={{ checked: selectedIds.length > 0 && selectedIds.length === filteredComplaints.length }} onPress={handleSelectAll} style={styles.bulkSelectAllBtn} activeOpacity={0.7}>
          <Ionicons
            name={selectedIds.length === filteredComplaints.length && filteredComplaints.length > 0 ? 'checkbox' : 'square-outline'}
            size={18}
            color={COLORS.primary}
            style={{ marginRight: SPACING.xs }}
          />
          <Text style={styles.bulkSelectAllText}>{selectedIds.length === 0 ? 'Select All' : `${selectedIds.length} Selected`}</Text>
        </TouchableOpacity>

        {selectedIds.length > 0 && (
          <Animated.View entering={FadeInUp.duration(200)} exiting={FadeOut.duration(200)} style={styles.bulkActionButtons}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
              <Button title="In Progress" accessibilityLabel="Mark selected incidents in progress" variant="secondary" size="sm" onPress={() => handleBulkStatus('In Progress')} disabled={bulkLoading} style={{ height: 32 }} icon={<Ionicons name="time" size={14} />} />
              <Button title="Resolve" accessibilityLabel="Resolve selected incidents" variant="default" size="sm" onPress={() => handleBulkStatus('Resolved')} disabled={bulkLoading} style={{ height: 32 }} icon={<Ionicons name="checkmark-circle" size={14} color="#FFF" />} />
              <Button title="Verify" accessibilityLabel="Verify selected incidents" variant="outline" size="sm" onPress={handleBulkVerify} disabled={bulkLoading} style={{ height: 32 }} icon={<Ionicons name="shield-checkmark" size={14} />} />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear selection" onPress={() => setSelectedIds([])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingLeft: 4 }}>
                <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        )}
      </View>
    );
  };

  if (loadError) return <RequestError message={loadError} onRetry={fetchComplaints} />;

  if (isDesktop) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        <Animated.View entering={FadeInDown.duration(400)} style={styles.desktopHeader}>

          <View>
            <Text style={styles.desktopTitle}>Complaint Queue</Text>
            <Text style={styles.desktopSubtitle}>Showing {filteredComplaints.length} of {pagination.total} matching civic issues</Text>
          </View>
          <View style={styles.desktopControls}>
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search ID, issue or location" style={styles.desktopSearch} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.desktopFilterBar}>
          <FilterChipGroup options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} containerStyle={styles.desktopFilterChips} />
          <Disclosure title="Priority and sorting" summary={`${priorityFilter === 'all' ? 'All priorities' : priorityFilter + ' priority'} · ${sortBy} first`}>{priorityControls}</Disclosure>
        </Animated.View>

        {renderBulkBar()}

        <View style={styles.tableHeaderRow}>
          <View style={styles.tableCheckboxHeader}>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel="Select all complaints on this page" accessibilityState={{ checked: selectedIds.length > 0 && selectedIds.length === filteredComplaints.length }} onPress={handleSelectAll} activeOpacity={0.8}>
              <Ionicons name={selectedIds.length === filteredComplaints.length && filteredComplaints.length > 0 ? 'checkbox' : 'square-outline'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableThumbHeader}><Text style={styles.tableHeaderLabel}>IMAGE</Text></View>
          <View style={styles.tableColTitle}><Text style={styles.tableHeaderLabel}>COMPLAINT</Text></View>
          <View style={styles.tableColComparison}><Text style={styles.tableHeaderLabel}>CATEGORY</Text></View>
          <View style={styles.tableColCitizen}><Text style={styles.tableHeaderLabel}>LOCATION</Text></View>
          <View style={styles.tableColDate}><Text style={styles.tableHeaderLabel}>DATE</Text></View>
          <View style={styles.tableColStatus}><Text style={styles.tableHeaderLabel}>STATUS</Text></View>
          <View style={styles.tableColActionsHeader}><Text style={styles.tableHeaderLabel}>ACTIONS</Text></View>
        </View>

        {loading && !refreshing ? (
          <LoadingSpinner message="Loading municipal complaints registry..." />
        ) : (
          <FlatList
            data={filteredComplaints}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(100 + index * 30)} layout={Layout.springify()}>
                <DesktopComplaintRow
                  complaint={item}
                  isSelected={selectedIds.includes(item._id)}
                  onToggleSelect={() => toggleSelect(item._id)}
                  onPress={() => navigation.navigate('AuthorityComplaintDetail', { complaintId: item._id })}
                  onVerify={handleVerify}
                />
              </Animated.View>
            )}
            contentContainerStyle={styles.desktopListContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            ListEmptyComponent={EmptyComponent}
            ListFooterComponent={paginationControls}
            showsVerticalScrollIndicator={false}
          />
        )}

        <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeAreaMobile}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <AuthorityMobileHeader
        title="Complaint Queue"
        rightNode={
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filteredComplaints.length}</Text>
          </View>
        }
      />

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.filterSection}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search incidents..." style={styles.searchBar} />
        <FilterChipGroup options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} containerStyle={styles.filterChips} />
        <Disclosure title="Priority and sorting" summary={`${priorityFilter === 'all' ? 'All priorities' : priorityFilter + ' priority'} · ${sortBy} first`}>{priorityControls}</Disclosure>
      </Animated.View>

      {renderBulkBar()}

      {loading && !refreshing ? (
        <LoadingSpinner message="Loading incidents..." />
      ) : (
        <FlatList
          data={filteredComplaints}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(100 + index * 40)} layout={Layout.springify()}>
              <MobileAuthorityCard
                complaint={item}
                isSelected={selectedIds.includes(item._id)}
                onToggleSelect={() => toggleSelect(item._id)}
                onPress={() => navigation.navigate('AuthorityComplaintDetail', { complaintId: item._id })}
                onVerify={handleVerify}
              />
            </Animated.View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          ListEmptyComponent={EmptyComponent}
            ListFooterComponent={paginationControls}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))} />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  safeAreaMobile: { flex: 1, backgroundColor: COLORS.background },

  // ── Desktop Table ──────────────────────────────────────────────────────────
  desktopHeader: { position: 'relative', overflow: 'hidden', minHeight: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xl, backgroundColor: COLORS.background },
  desktopTitle: { ...TYPOGRAPHY.h1, color: COLORS.textPrimary },
  desktopSubtitle: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: '500', marginTop: SPACING.xs },
  desktopControls: { width: 380 },
  desktopSearch: { marginBottom: 0 },
  desktopFilterBar: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  desktopFilterChips: { paddingVertical: SPACING.xs },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.background, borderBottomWidth: 2, borderBottomColor: COLORS.borderLight },
  tableThumbHeader: { width: 44, marginRight: 14 },
  tableHeaderLabel: { ...TYPOGRAPHY.overline, color: COLORS.textSecondary },
  desktopListContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING['6xl'] },
  tableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.sm, ...(Platform.OS === 'web' ? { transition: 'all 0.1s ease-in-out' as any } : {}) },
  tableRowHovered: { borderColor: COLORS.border, backgroundColor: COLORS.backgroundNeutral },
  tableThumbWrapper: { width: 44, marginRight: 14, alignItems: 'center' },
  tableThumb: { width: 44, height: 44, borderRadius: BORDER_RADIUS.sm, overflow: 'hidden', backgroundColor: COLORS.backgroundNeutral },
  tableThumbImg: { width: '100%', height: '100%' },
  tableThumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  tableColTitle: { flex: 2, marginRight: 14 },
  civRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
  complaintCodeText: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  tableTitle: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary },
  tableColComparison: { flex: 1.5, marginRight: 14, justifyContent: 'center' },
  catCompareItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 2 },
  catCompareKey: { ...TYPOGRAPHY.caption, fontSize: 9, fontWeight: '800', color: COLORS.textMuted, width: 28 },
  catCompareVal: { ...TYPOGRAPHY.caption, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  tableColCitizen: { flex: 1.3, marginRight: 14 },
  tableCitizenName: { ...TYPOGRAPHY.bodySmall, fontWeight: '700', color: COLORS.textPrimary },
  tableCitizenContact: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginTop: 1 },
  tableColDate: { width: 80, marginRight: 14 },
  tableDate: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontWeight: '500' },
  tableColStatus: { width: 105, marginRight: 14 },
  tableColActionsHeader: { width: 130 },
  tableColActions: { width: 130, flexDirection: 'row', alignItems: 'center' },

  // ── Mobile ────────────────────────────────────────────────────────────────
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: Platform.OS === 'ios' ? SPACING.md : SPACING.lg, paddingBottom: SPACING.lg, backgroundColor: '#0F172A' },
  backBtn: { width: 38, height: 38, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginRight: SPACING.md },
  headerTitle: { ...TYPOGRAPHY.h3, color: '#FFFFFF', flex: 1 },
  countPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  countPillText: { ...TYPOGRAPHY.caption, fontWeight: '800', color: '#FFFFFF' },
  filterSection: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  searchBar: { marginBottom: SPACING.sm },
  filterChips: { paddingVertical: SPACING.xs },
  listContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 32 },
  mobileCard: { marginBottom: SPACING.md, padding: 0 },
  mobileCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md, gap: SPACING.xs },
  mobileCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap', flex: 1, minWidth: 0 },
  mobileCardBody: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center', minWidth: 0 },
  mobileCardImg: { width: 68, height: 68, borderRadius: BORDER_RADIUS.md, flexShrink: 0 },
  mobileCardImgPlaceholder: { width: 68, height: 68, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.backgroundNeutral, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mobileCardContent: { flex: 1, minWidth: 0 },
  mobileCardTitle: { ...TYPOGRAPHY.bodyBold, color: COLORS.textPrimary, marginBottom: 4 },
  mobileCardLocation: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 2 },
  mobileCardCitizen: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontWeight: '500' },
  mobileCompareBanner: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
  mobileCompareCol: { flex: 1 },
  mobileCompareLabel: { ...TYPOGRAPHY.caption, fontSize: 9, fontWeight: '800', color: COLORS.textMuted, marginBottom: 2, letterSpacing: 0.3 },
  mobileCompareValue: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textPrimary },
  mobileCompareDivider: { width: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.sm },
  mobileCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xl, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  mobileCardDate: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontWeight: '500' },
  mobileActionGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexShrink: 0 },
  emptyContainer: { padding: SPACING['5xl'], alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderLight, marginTop: SPACING.xl },
  emptyIconCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  emptySub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 280 },
  tableCheckboxBtn: { width: 32, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.xs },
  tableCheckboxHeader: { width: 32, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.xs },
  tableRowSelected: { backgroundColor: COLORS.backgroundNeutral, borderColor: COLORS.border },
  mobileCheckboxBtn: { marginRight: 4, padding: 2 },
  mobileCardSelected: { borderColor: COLORS.border, backgroundColor: COLORS.backgroundNeutral },
  bulkToolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  bulkSelectAllBtn: { flexDirection: 'row', alignItems: 'center' },
  bulkSelectAllText: { ...TYPOGRAPHY.bodySmall, fontWeight: '800', color: COLORS.textPrimary },
  bulkActionButtons: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1, justifyContent: 'flex-end', minWidth: 0, flexWrap: 'wrap' },
});
