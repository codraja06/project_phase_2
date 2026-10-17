import { FilterChipGroup } from '../../components/FilterChip';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CitizenTabParamList } from '../../types/navigation';
import { aiApi } from '../../api/aiApi';
import { complaintApi } from '../../api/complaintApi';
import { locationService } from '../../services/location';
import { managementApi, DuplicateMatch } from '../../api/managementApi';
import { CivicHero } from '../../components/CivicVisuals';
import { AIDetectResponse, DetectionResult, SeverityAssessment } from '../../types/ai';
import { Complaint } from '../../types/complaint';
import { ImagePickerCamera } from '../../components/ImagePickerCamera';
import { DetectionOverlay } from '../../components/DetectionOverlay';
import { MapLocationPicker } from '../../components/MapLocationPicker';
import { CategorySelector } from '../../components/CategorySelector';
import { DescriptionEditor } from '../../components/DescriptionEditor';
import { TriageSummary } from '../../components/TriageSummary';
import { LocationCard } from '../../components/LocationCard';
import { SuccessModal } from '../../components/SuccessModal';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { COLORS } from '../../theme/colors';
import { BORDER_RADIUS } from '../../theme/radius';
import { SHADOWS } from '../../theme/index';
import { SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';
import { useBreakpoint } from '../../hooks/useBreakpoint';

type Props = NativeStackScreenProps<CitizenTabParamList, 'ReportIssue'>;
type Step = 'capture' | 'ai_analysis' | 'location' | 'review';

export const ReportIssueScreen: React.FC<Props> = ({ navigation, route }) => {
  const { isDesktop, isWide } = useBreakpoint();
  const imageRequest = useRef(0);
  const [detectionMode, setDetectionMode] = useState('auto');
  const [modelNotice, setModelNotice] = useState('');
  const [modelAvailability, setModelAvailability] = useState('Checking detection model availability…');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('capture');

  // Form & Detection States
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [serverImageUrl, setServerImageUrl] = useState<string>('');
  const [detectingAI, setDetectingAI] = useState<boolean>(false);
  const [aiDetections, setAiDetections] = useState<DetectionResult[]>([]);
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const [aiDetectedClass, setAiDetectedClass] = useState<string>('');
  const [aiDetected, setAiDetected] = useState<boolean>(false);
  const [severity, setSeverity] = useState<SeverityAssessment>();
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [analysisToken, setAnalysisToken] = useState('');
  const [uploadToken, setUploadToken] = useState('');

  // Category & Description
  const [selectedCategory, setSelectedCategory] = useState<string>('pothole');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  // Location
  const [latitude, setLatitude] = useState<number>(NaN);
  const [longitude, setLongitude] = useState<number>(NaN);
  const [address, setAddress] = useState<string>('Fetching device location...');
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  // Submission & Success Modal
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateCheckMessage, setDuplicateCheckMessage] = useState('');
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  useEffect(() => () => { if (localImageUri?.startsWith('blob:')) URL.revokeObjectURL(localImageUri); }, [localImageUri]);

  useEffect(() => {
    let active = true;
    aiApi.getModels().then(result => {
      if (!active) return;
      const categories = [...new Set(result.models.filter(model => model.state === 'ready').flatMap(model => model.categories || []))];
      setModelAvailability(categories.length ? `Available detection classes: ${categories.map(category => category.replace(/_/g, ' ')).join(', ')}. Other categories can be reported manually.` : result.message || 'No compatible detection models are currently available. Manual reporting remains available.');
    }).catch(() => { if (active) setModelAvailability('Model availability could not be checked. Manual reporting remains available.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
    if (route.params?.initialCategory) {
      setSelectedCategory(route.params.initialCategory);
    }
  }, [route.params?.initialCategory]);

  const animateStepChange = (nextStep: Step) => {
    // using reanimated entering/exiting handles transitions nicely.
    setCurrentStep(nextStep);
  };

  const fetchCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const loc = await locationService.getCurrentLocation();
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      setAddress(loc.address);
      setLocationConfirmed(true);
      setErrorMessage(null);
    } catch (error: any) {
      setAddress('Choose the incident location');
      setErrorMessage(error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleImageSelected = async (uri: string) => {
    const request = ++imageRequest.current;
    setServerImageUrl('');
    setLocalImageUri(uri);
    setAiDetections([]);
    setAiConfidence(0);
    setAiDetectedClass('');
    setAiDetected(false);
    setSeverity(undefined);
    setGeneratedDescription('');
    setAnalysisToken('');
    setUploadToken('');
    setDescription('');
    setErrorMessage(null);
    animateStepChange('ai_analysis');

    try {
      setDetectingAI(true);
      const [detectRes, upload] = await Promise.all([
        aiApi.detectIssue(uri, detectionMode).catch((e): AIDetectResponse => {
          console.warn('AI detection service warning:', e.message);
          return { detected: false, detections: [], message: e.message };
        }),
        aiApi.uploadImageWithEvidence(uri).catch((e) => { if (request === imageRequest.current) setErrorMessage(e.message); return { imageUrl: '', uploadToken: '' }; }),
      ]);

      if (request !== imageRequest.current) return;
      setServerImageUrl(upload.imageUrl);
      setUploadToken(upload.uploadToken);
      setModelNotice((detectRes.warnings || []).join(' ') || (!detectRes.detected ? detectRes.message || '' : `Models used: ${(detectRes.modelsUsed || []).join(', ')}`));
      setSeverity(detectRes.severity);
      setAnalysisToken(detectRes.analysisToken || '');
      setGeneratedDescription(detectRes.generatedDescription || '');
      setDescription(detectRes.generatedDescription || '');

      if (detectRes && detectRes.detected && detectRes.detections && detectRes.detections.length > 0) {
        setAiDetections(detectRes.detections);
        const topDetection = detectRes.detections[0];
        setAiConfidence(topDetection.confidence);
        setAiDetectedClass(topDetection.category);
        setAiDetected(true);

        const mappedCategory = topDetection.category.toLowerCase().replace(/ /g, '_');
        setSelectedCategory(mappedCategory);
        const genTitle = `${topDetection.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Issue`;
        setTitle(genTitle);
      } else {
        setAiDetected(false);
        setSelectedCategory('other');
        setTitle('Civic Hazard Reported');
      }
    } catch (error: any) {
      setAiDetected(false);
      setSelectedCategory('other');
      setTitle('Civic Hazard Reported');
      setDescription('');
    } finally {
      if (request === imageRequest.current) setDetectingAI(false);
    }
  };

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    const catLabel = cat.replace(/_/g, ' ').toUpperCase();
    setTitle(`${catLabel.charAt(0) + catLabel.slice(1).toLowerCase()} Hazard Reported`);
  };

  const handleRetake = () => {
    setDuplicateMatches([]);
    setDuplicateCheckMessage('');
    setSeverity(undefined);
    setGeneratedDescription('');
    setAnalysisToken('');
    setUploadToken('');
    imageRequest.current++;
    setDetectingAI(false);
    setLocalImageUri(null);
    setServerImageUrl('');
    setAiDetections([]);
    setAiConfidence(0);
    setAiDetectedClass('');
    setAiDetected(false);
    setCustomCategory('');
    setDescription('');
    setTitle('');
    animateStepChange('capture');
  };

  const reviewPossibleDuplicates = async () => {
    setCheckingDuplicates(true);
    setDuplicateMatches([]);
    setDuplicateCheckMessage('');
    try {
      const result = await managementApi.checkDuplicates({ category: selectedCategory, latitude, longitude, uploadToken: uploadToken || undefined });
      setDuplicateMatches(result.matches);
      if (result.matches.length) setDuplicateCheckMessage(result.reason);
    } catch {
      setDuplicateCheckMessage('Nearby report check is unavailable. You can still submit your report.');
    } finally {
      setCheckingDuplicates(false);
      animateStepChange('review');
    }
  };

  const handleBackStep = () => {
    if (currentStep === 'ai_analysis') {
      handleRetake();
    } else if (currentStep === 'location') {
      animateStepChange('ai_analysis');
    } else if (currentStep === 'review') {
      animateStepChange('location');
    } else {
      navigation.navigate('CitizenDashboard');
    }
  };

  const handleSubmitComplaint = async () => {
    if (submitting) return;
    try {
      setErrorMessage(null);
      if (!localImageUri && !serverImageUrl) {
        setErrorMessage('An incident photo is required.');
        return;
      }
      if (!description || description.trim().length < 5) {
        setErrorMessage('Please provide a description of at least 5 characters.');
        return;
      }
      if (selectedCategory === 'other' && !customCategory.trim()) {
        setErrorMessage('Please specify the custom category for this issue.');
        return;
      }

      if (!locationConfirmed) { setErrorMessage('Confirm a real incident location before submitting.'); return; }
      setSubmitting(true);

      // Ensure image is uploaded if it's still a local file or blob
      let finalImageUrl = serverImageUrl || localImageUri || '';
      let finalUploadToken = uploadToken;
      if (localImageUri && (!serverImageUrl || serverImageUrl.startsWith('blob:') || serverImageUrl.startsWith('file:') || serverImageUrl.startsWith('ph:'))) {
        const upload = await aiApi.uploadImageWithEvidence(localImageUri);
        finalImageUrl = upload.imageUrl;
        finalUploadToken = upload.uploadToken;
        setUploadToken(finalUploadToken);
        setServerImageUrl(finalImageUrl);
      }
      if (!/^https?:\/\//i.test(finalImageUrl)) throw new Error('Image upload failed. Please retry.');

      // Format bounding boxes so both flat coordinates and nested bbox are present
      const formattedBoxes = (aiDetections || []).map((det) => ({
        category: det.category || 'issue',
        className: det.category || 'issue',
        confidence: det.confidence || 0,
        x1: det.bbox?.x1 ?? 0,
        y1: det.bbox?.y1 ?? 0,
        x2: det.bbox?.x2 ?? 0,
        y2: det.bbox?.y2 ?? 0,
        bbox: {
          x1: det.bbox?.x1 ?? 0,
          y1: det.bbox?.y1 ?? 0,
          x2: det.bbox?.x2 ?? 0,
          y2: det.bbox?.y2 ?? 0},
        model: det.model || 'yolov8'}));

      const payload = {
        title: title || `${selectedCategory.replace(/_/g, ' ')} Reported`,
        description: description.trim(),
        category: selectedCategory,
        customCategory: selectedCategory === 'other' ? customCategory.trim() : '',
        imageUrl: finalImageUrl,
        aiDetected,
        aiClass: aiDetectedClass,
        aiConfidence,
        boundingBoxes: formattedBoxes,
        latitude,
        longitude,
        address: address || 'Captured Location',
        analysisToken: analysisToken || undefined,
        uploadToken: finalUploadToken || undefined};

      const result = await complaintApi.createComplaint(payload);
      setCreatedComplaint(result);
      setShowSuccessModal(true);
    } catch (error: any) {
      const err = error.message || 'Unable to register complaint. Please check your connection and try again.';
      setErrorMessage(err);
      Alert.alert('Complaint Registration Failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const stepList: { key: Step; label: string; num: number }[] = [
    { key: 'capture', label: 'Photo', num: 1 },
    { key: 'ai_analysis', label: 'AI Vision', num: 2 },
    { key: 'location', label: 'GPS Pin', num: 3 },
    { key: 'review', label: 'Submit', num: 4 },
  ];
  const currentStepIndex = stepList.findIndex((s) => s.key === currentStep);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundNeutral} />

      {/* Screen Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.backBtn} onPress={handleBackStep} activeOpacity={0.7} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerTitle}>
            {currentStep === 'capture' && 'Report Civic Hazard'}
            {currentStep === 'ai_analysis' && 'AI Defect Analysis'}
            {currentStep === 'location' && 'Confirm GPS Location'}
            {currentStep === 'review' && 'Review & Submit Report'}
          </Text>
        </View>
      </View>

      {/* Stepper Progress Bar */}
      <View style={styles.stepperContainer}>
        {stepList.map((step, idx) => {
          const isCurrent = currentStep === step.key;
          const isDone = idx < currentStepIndex;

          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepPill}>
                <Animated.View style={[styles.stepCircle, isCurrent && styles.stepCircleCurrent, isDone && styles.stepCircleDone]}>
                  {isDone ? (
                    <Animated.View entering={ZoomIn}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </Animated.View>
                  ) : (
                    <Text style={[styles.stepNumText, isCurrent && styles.stepNumTextCurrent]}>{step.num}</Text>
                  )}
                </Animated.View>
                <Text style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent, isDone && styles.stepLabelDone]} numberOfLines={1}>
                  {step.label}
                </Text>
              </View>
              {idx < stepList.length - 1 && (
                <View style={[styles.stepLine, idx < currentStepIndex && styles.stepLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {currentStep === 'capture' && <View style={{ width: '100%', marginBottom: 20 }}><CivicHero compact photo="bridge" eyebrow="PHOTO / LOCATION / ACTION" title="Make the issue visible." description="A clear photo and a precise location help your authority understand what needs attention." /></View>}
          <View style={[styles.reportWorkspace, isWide && styles.reportWorkspaceWide]}>
            {isWide && <View style={styles.evidencePane}>
              <Text style={styles.evidenceEyebrow}>YOUR REPORT / EVIDENCE</Text>
              <Text style={styles.evidenceTitle}>Make the issue clear.</Text>
              <Text style={styles.evidenceText}>A photo, an accurate location and your observations help the authority assess the report.</Text>
              {localImageUri ? <DetectionOverlay imageUri={localImageUri} detections={aiDetections} confidence={aiConfidence} height={360} /> : <View style={styles.evidenceEmpty}><Ionicons name="camera-outline" size={44} color={COLORS.primary} /><Text style={styles.evidenceText}>Your issue photo and detection results will appear here.</Text></View>}
              <Text style={styles.evidenceText}>Experimental severity requires review. You approve the final description; authorities verify the issue and control its status.</Text>
            </View>}
          <View style={[styles.mainWrapper, isWide && styles.mainWrapperWide]}>
            {errorMessage ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} style={{ marginRight: SPACING.xs }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </Animated.View>
            ) : null}

            {/* STEP 1: CAPTURE */}
            {currentStep === 'capture' && (
              <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.stepContainer}>
                <Text style={styles.reviewSectionLabel}>DETECTION MODE</Text>
                <FilterChipGroup options={[
                  { label: 'Automatic', value: 'auto' }, { label: 'Pothole', value: 'pothole' }, { label: 'Road damage', value: 'road_damage' },
                  { label: 'Garbage', value: 'garbage' }, { label: 'Streetlight', value: 'broken_streetlight' }, { label: 'Water leakage', value: 'water_leakage' },
                ]} selectedValue={detectionMode} onSelect={setDetectionMode} />
                <Text style={styles.evidenceText}>Automatic runs all available models. A selected category requires compatible trained weights. You can always enter details manually.</Text>
                <Text accessibilityLiveRegion="polite" style={styles.evidenceText}>{modelAvailability}</Text>
                <ImagePickerCamera imageUri={localImageUri} onImageSelected={handleImageSelected} onRetakeImage={handleRetake} />
              </Animated.View>
            )}

            {/* STEP 2: AI ANALYSIS */}
            {currentStep === 'ai_analysis' && (
              <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.stepContainer}>
                {detectingAI ? (
                  <Card style={styles.loadingCard}>
                    <CardContent style={styles.loadingContent}>
                      <ActivityIndicator color={COLORS.primary} size="large" style={{ marginBottom: SPACING.lg }} />
                      <Text style={styles.loadingTitle}>Analyzing Image</Text>
                      <Text style={styles.loadingSubtitle}>AI is detecting civic issues...</Text>
                    </CardContent>
                  </Card>
                ) : localImageUri ? (
                  <>
                    {!aiDetected && (
                      <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
                        <Ionicons name="information-circle" size={18} color={COLORS.error} style={{ marginRight: SPACING.xs }} />
                        <Text style={styles.errorText}>AI could not identify this issue automatically. Please select a category below.</Text>
                      </Animated.View>
                    )}
                    <Animated.View entering={FadeInUp.delay(100)} style={isWide ? { display: 'none' } : undefined}>
                      <DetectionOverlay imageUri={localImageUri} detections={aiDetections} confidence={aiConfidence} height={260} />
                    </Animated.View>
                    <Animated.View entering={FadeInUp.delay(200)}>
                      {!!modelNotice && <Text accessibilityLiveRegion="polite" style={styles.evidenceText}>{modelNotice}</Text>}
                      <TriageSummary severity={severity} />
                      <CategorySelector selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} customCategory={customCategory} onChangeCustomCategory={setCustomCategory} aiDetected={aiDetected} aiClass={aiDetectedClass} aiConfidence={aiConfidence} />
                    </Animated.View>
                    <Animated.View entering={FadeInUp.delay(300)}>
                      <DescriptionEditor category={selectedCategory} customCategory={customCategory} description={description} onChangeDescription={setDescription} address={address} generatedDescription={generatedDescription} />
                      {analysisToken && <Button title="Continue without AI assessment" variant="ghost" onPress={() => {
                        setAnalysisToken(''); setSeverity(undefined); setGeneratedDescription('');
                      }} />}
                    </Animated.View>
                    
                    <Animated.View entering={FadeInUp.delay(400)} style={styles.buttonRow}>
                      <Button title="Remove / Replace Photo" onPress={handleRetake} variant="secondary" size="lg" style={{ flexGrow: 1, flexBasis: 160 }} />
                      <Button title="Continue to Location" onPress={() => animateStepChange('location')} variant="default" size="lg" style={{ flexGrow: 1, flexBasis: 220 }} />
                    </Animated.View>
                  </>
                ) : null}
              </Animated.View>
            )}

            {/* STEP 3: LOCATION */}
            {currentStep === 'location' && (
              <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.stepContainer}>
                {locationLoading ? (
                  <Card style={styles.loadingCard}>
                    <CardContent style={styles.loadingContent}>
                      <ActivityIndicator color={COLORS.primary} size="large" style={{ marginBottom: SPACING.md }} />
                      <Text style={styles.loadingTitle}>Triangulating GPS coordinates...</Text>
                      <Text style={styles.loadingSubtitle}>Acquiring high-accuracy satellite fix</Text>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                      <MapLocationPicker
                        latitude={latitude}
                        longitude={longitude}
                        address={address}
                        height={290}
                        showCard={true}
                        onSelectLocation={(lat, lng) => {
                          setLocationConfirmed(true);
                          setErrorMessage(null);
                          setLatitude(lat);
                          setLongitude(lng);
                          setAddress(`Coordinates Lat: ${lat.toFixed(4)}, Long: ${lng.toFixed(4)}`);
                          void locationService.reverseGeocode(lat, lng).then((resolvedAddr) => {
                            if (resolvedAddr) setAddress(resolvedAddr);
                          });
                        }}
                        onUseCurrentLocation={fetchCurrentLocation}
                      />
                    <Animated.View entering={FadeInUp.delay(200)}>
                      <LocationCard address={address} latitude={latitude} longitude={longitude} onRefreshLocation={fetchCurrentLocation} />
                    </Animated.View>
                    <Animated.View entering={FadeInUp.delay(300)}>
                      <Button title={checkingDuplicates ? 'Checking nearby reports…' : 'Confirm Location & Review'} disabled={!locationConfirmed || checkingDuplicates} loading={checkingDuplicates} onPress={reviewPossibleDuplicates} variant="default" size="lg" style={{ marginTop: SPACING.xs }} />
                    </Animated.View>
                  </>
                )}
              </Animated.View>
            )}

            {/* STEP 4: REVIEW */}
            {currentStep === 'review' && (
              <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.stepContainer}>
                <Card style={styles.reviewCard}>
                  <CardContent style={styles.reviewContent}>
                    <Text style={styles.reviewCardTitle}>Incident Summary</Text>
                    <TriageSummary severity={severity} />
                    {!!duplicateCheckMessage && <View accessibilityRole="alert" style={{ backgroundColor: COLORS.pendingLight, padding: 12, borderRadius: 8, marginVertical: 12 }}>
                      <Text style={{ color: COLORS.pendingDark, fontWeight: '700' }}>{duplicateMatches.length ? 'Possible duplicate reports nearby' : 'Nearby report check'}</Text>
                      <Text style={{ color: COLORS.textPrimary, marginTop: 4 }}>{duplicateCheckMessage}</Text>
                      {duplicateMatches.map((match, index) => <Text key={`${index}-${match.distanceMeters}`} style={{ color: COLORS.textPrimary, marginTop: 6 }}>
                        {match.complaintId || 'Another citizen’s report'} · about {match.distanceMeters} m away · {match.status}
                      </Text>)}
                      {duplicateMatches.length > 0 && <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>You can continue if this is a distinct issue or you have useful additional evidence.</Text>}
                    </View>}
                    <View style={styles.reviewThumbRow}>
                      {localImageUri ? <Image source={{ uri: localImageUri }} style={styles.reviewThumb} /> : null}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewCategoryLabel}>SELECTED CATEGORY</Text>
                        <Text style={styles.reviewCategoryVal}>
                          {selectedCategory === 'other' && customCategory ? customCategory.toUpperCase() : selectedCategory.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                        {aiConfidence > 0 && <Badge label={`${Math.round(aiConfidence * 100)}% Match`} variant="warning" icon={<Ionicons name="sparkles" size={10} color="#FFFFFF" />} />}
                      </View>
                    </View>
                    <View style={styles.reviewSection}>
                      <Text style={styles.reviewSectionLabel}>DESCRIPTION</Text>
                      <Text style={styles.reviewSectionBody}>{description}</Text>
                    </View>
                    <View style={styles.reviewSection}>
                      <Text style={styles.reviewSectionLabel}>INCIDENT LOCATION</Text>
                      <View style={styles.reviewLocationRow}>
                        <Ionicons name="location-outline" size={16} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                        <Text style={styles.reviewLocationText}>{address}</Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
                <Animated.View entering={FadeInUp.delay(200)}>
                  <Button title={submitting ? "Submitting Report..." : "SUBMIT COMPLAINT"} onPress={handleSubmitComplaint} variant="default" size="lg" loading={submitting} disabled={submitting} style={{ marginTop: SPACING.xs }} />
                </Animated.View>
              </Animated.View>
            )}
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal visible={showSuccessModal} complaintId={createdComplaint?.complaintId || ''} title="Complaint registered successfully" message="Your complaint has been successfully registered and routed to municipal operations." onViewComplaint={() => { setShowSuccessModal(false); if (createdComplaint?._id) { handleRetake(); (navigation as any).navigate('ComplaintDetail', { complaintId: createdComplaint._id }); } else { handleRetake(); navigation.navigate('ComplaintHistory'); } }} onClose={() => { setShowSuccessModal(false); handleRetake(); navigation.navigate('CitizenDashboard'); }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.backgroundNeutral },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg, backgroundColor: COLORS.backgroundNeutral },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderLight, marginRight: SPACING.md, ...SHADOWS.sm },
  headerTextWrapper: { flex: 1 },
  headerTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, ...SHADOWS.sm },
  stepPill: { flex: 1, flexDirection: 'column', gap: 4, alignItems: 'center', minWidth: 0 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  stepCircleCurrent: { backgroundColor: COLORS.primary },
  stepCircleDone: { backgroundColor: COLORS.primaryDark },
  stepNumText: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textSecondary },
  stepNumTextCurrent: { color: COLORS.surface },
  stepLabel: { ...TYPOGRAPHY.caption, fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },
  stepLabelCurrent: { color: COLORS.primary, fontWeight: '800' },
  stepLabelDone: { color: COLORS.textPrimary, fontWeight: '700' },
  stepLine: { width: 14, height: 2, backgroundColor: COLORS.borderLight, marginHorizontal: 2, marginBottom: 14, flexShrink: 1 },
  stepLineDone: { backgroundColor: COLORS.primary },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING['5xl'] },
  scrollContentDesktop: { paddingTop: SPACING['3xl'], paddingBottom: SPACING['7xl'] },
  reportWorkspace: { width: '100%', maxWidth: 1440, alignSelf: 'center', gap: 28 },
  reportWorkspaceWide: { flexDirection: 'row', alignItems: 'flex-start' },
  evidencePane: { flex: 1, minWidth: 0, backgroundColor: COLORS.surface, padding: 24, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 12, gap: 18 },
  evidenceEyebrow: { color: COLORS.primary, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  evidenceTitle: { color: COLORS.textPrimary, fontSize: 29, lineHeight: 37, letterSpacing: -.7, fontWeight: '600' },
  evidenceText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 21, marginBottom: 12 },
  evidenceEmpty: { minHeight: 240, padding: 28, gap: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight, borderRadius: 8 },
  mainWrapperWide: { flex: 1.15, maxWidth: 800, minWidth: 0 },
  mainWrapper: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  stepContainer: { width: '100%' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.errorLight, padding: SPACING.lg, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.errorBorder },
  errorText: { ...TYPOGRAPHY.caption, color: COLORS.errorDark, fontWeight: '600', flex: 1 },
  loadingCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xl },
  loadingContent: { padding: SPACING['5xl'], alignItems: 'center' },
  loadingTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  loadingSubtitle: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.xl },
  reviewCard: { marginBottom: SPACING.xl },
  reviewContent: { padding: SPACING['2xl'] },
  reviewCardTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: SPACING.lg },
  reviewThumbRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: SPACING.lg, paddingBottom: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  reviewThumb: { width: 80, height: 80, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.backgroundNeutral },
  reviewCategoryLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted, marginBottom: SPACING.xs },
  reviewCategoryVal: { ...TYPOGRAPHY.h4, color: COLORS.primary, marginBottom: SPACING.sm },
  reviewSection: { marginBottom: SPACING.lg },
  reviewSectionLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted, marginBottom: SPACING.xs },
  reviewSectionBody: { ...TYPOGRAPHY.body, color: COLORS.textPrimary },
  reviewLocationRow: { flexDirection: 'row', alignItems: 'center' },
  reviewLocationText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.textPrimary, flex: 1 }});
