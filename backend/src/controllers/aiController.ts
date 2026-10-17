import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { detectCivicIssue, getDetectionModels } from '../services/aiService';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import fs from 'fs';
import { createHash } from 'crypto';
import { signEvidence, unavailableSeverity } from '../services/triageService';
import { z } from 'zod';

export const getModels = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json(new ApiResponse('Detection model availability', await getDetectionModels())); }
  catch (error) { next(error); }
};

export const detectIssue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let filePath = '';
  try {
    if (!req.file) {
      throw new ApiError(400, 'Image file is required for AI detection.');
    }

    filePath = req.file.path;
    const imageHash = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    const category = z.enum(['auto','pothole','road_damage','garbage','garbage_overflow','broken_streetlight','water_leakage','drainage','drainage_problem','dead_animal','broken_tree']).default('auto').parse(req.body.category);
    const aiResult = await detectCivicIssue(filePath, category);
    const severity = { ...(aiResult.severity || unavailableSeverity()),
      assessedAt: new Date().toISOString(), imageHash };
    const generatedDescription = aiResult.generatedDescription || '';
    const analysisToken = signEvidence({ imageHash, severity, generatedDescription,
      detections: aiResult.detections || [] }, 'analysis', req.user!._id.toString());

    // Clean up local temp file after sending to AI microservice
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Determine user-facing message based on detection result
    let message = aiResult.message || 'AI Detection completed successfully';
    if (!aiResult.detected) {
      message = aiResult.message || 'No civic issue detected in this image. Please try a clearer photo or select the category manually.';
    } else if (aiResult.detections && aiResult.detections.length > 0) {
      const topClass = aiResult.detections[0].category.replace(/_/g, ' ');
      const topConf = Math.round(aiResult.detections[0].confidence * 100);
      message = `Detected: ${topClass} (${topConf}% confidence)`;
    }

    res.status(200).json(
      new ApiResponse(message, {
        detected: aiResult.detected,
        message,
        detections: aiResult.detections || [],
        severity,
        generatedDescription,
        analysisToken,
        modelsUsed: aiResult.modelsUsed || [],
        warnings: aiResult.warnings || [],
      })
    );
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // ignore unlink failure
      }
    }
    next(error);
  }
};
