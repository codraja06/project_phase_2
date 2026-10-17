import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { SeverityAssessment } from './triageService';

export interface DetectionResult {
  category: string;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  model: string;
}

export interface PredictResponse {
  severity?: SeverityAssessment;
  generatedDescription?: string | null;
  modelsUsed?: string[];
  warnings?: string[];
  detected: boolean;
  message?: string;
  detections: DetectionResult[];
}

export const detectCivicIssue = async (filePath: string, category = 'auto'): Promise<PredictResponse> => {
  try {
    const formData = new FormData();
    const filename = path.basename(filePath) || 'civic_issue.jpg';
    formData.append('category', category);
    formData.append('image', fs.createReadStream(filePath), {
      filename,
      contentType: 'image/jpeg',
    });

    const response = await axios.post<PredictResponse>(
      `${env.AI_SERVICE_URL}/predict`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 45000, // Allow CPU-based inference across the four models on Render.
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      throw new ApiError(
        status,
        data.detail || data.message || 'AI service prediction error.'
      );
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new ApiError(
        503,
        'AI Computer Vision service is currently unavailable. Please ensure python AI microservice is running.'
      );
    }
    throw new ApiError(500, `AI Service error: ${error.message}`);
  }
};

export const getDetectionModels = async () => {
  try {
    const response = await axios.get(`${env.AI_SERVICE_URL}/health`, { timeout: 5000 });
    return { available: Boolean(response.data.modelConfigured), models: response.data.models || [] };
  } catch { return { available: false, models: [], message: 'Model availability could not be checked. You can still enter a report manually.' }; }
};
