import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import fs from 'fs';
import { createHash } from 'crypto';
import { signEvidence } from '../services/triageService';
import { fingerprintUpload } from '../services/imageSimilarityService';

export const uploadImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Image file is required.');
    }

    const imageHash = createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');
    const imageFingerprint = await fingerprintUpload(req.file);
    const imageUrl = await uploadToCloudinary(req.file.path);
    const uploadToken = signEvidence({ imageHash, imageUrl, imageFingerprint }, 'upload', req.user!._id.toString());

    res.status(200).json(
      new ApiResponse('Image uploaded successfully', {
        imageUrl,
        uploadToken,
      })
    );
  } catch (error) {
    next(error);
  }
};
