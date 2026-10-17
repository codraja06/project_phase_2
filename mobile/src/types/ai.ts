export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DetectionResult {
  category: string;
  confidence: number;
  bbox: BoundingBox;
  model: string;
  modelVersion?: string;
}

export interface AIDetectResponse {
  warnings?: string[];
  modelsUsed?: string[];
  severity?: SeverityAssessment;
  generatedDescription?: string;
  analysisToken?: string;
  detected: boolean;
  message?: string;
  detections: DetectionResult[];
}

export interface SeverityAssessment {
  level: 'Low' | 'Medium' | 'High' | null;
  state: 'estimated' | 'uncertain' | 'unavailable';
  method: string;
  validated: boolean;
  reason: string;
  evidence: { category: string; detectionConfidence: number; imageCoverage: number; model: string }[];
}
