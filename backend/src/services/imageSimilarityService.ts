import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { z } from 'zod';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

export const fingerprintSchema = z.object({ method: z.literal('dhash64-rgb48-v1'),
  hash: z.string().regex(/^[a-f0-9]{16}$/), histogram: z.array(z.number().finite().min(0).max(1)).length(48) });
export type ImageFingerprint = z.infer<typeof fingerprintSchema>;

export async function fingerprintUpload(file: Express.Multer.File): Promise<ImageFingerprint | undefined> {
  const form = new FormData(); form.append('image', fs.createReadStream(file.path), { filename: file.filename, contentType: file.mimetype });
  try {
    const response = await axios.post(`${env.AI_SERVICE_URL}/image-signature`, form, { headers: form.getHeaders(), timeout: 6000, maxRedirects: 0 });
    return fingerprintSchema.parse(response.data);
  } catch (error: any) {
    if (error.response?.status === 400 || error.response?.status === 413) throw new ApiError(400, 'Choose a valid JPEG, PNG or WebP image up to 10 MB and 24 megapixels.');
    // Image comparison is optional during an outage; do not invent a signature.
    return undefined;
  }
}

export function compareFingerprints(first: unknown, second: unknown) {
  const a = fingerprintSchema.safeParse(first), b = fingerprintSchema.safeParse(second);
  if (!a.success || !b.success) return null;
  let xor = BigInt('0x' + a.data.hash) ^ BigInt('0x' + b.data.hash), hashDistance = 0;
  while (xor) { hashDistance += Number(xor & BigInt(1)); xor >>= BigInt(1); }
  const dot = a.data.histogram.reduce((sum, value, i) => sum + value * b.data.histogram[i], 0);
  const norm = Math.sqrt(a.data.histogram.reduce((s, v) => s + v * v, 0) * b.data.histogram.reduce((s, v) => s + v * v, 0));
  const colorSimilarity = norm ? dot / norm : 0;
  return { hashDistance, colorSimilarity, similar: hashDistance <= env.DUPLICATE_MAX_HASH_DISTANCE && colorSimilarity >= env.DUPLICATE_MIN_COLOR_SIMILARITY };
}
