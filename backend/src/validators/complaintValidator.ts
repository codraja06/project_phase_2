import { z } from 'zod';

export const boundingBoxSchema = z.object({
  category: z.string().optional(),
  className: z.string().optional(),
  confidence: z.coerce.number().optional().default(0),
  x1: z.coerce.number().optional(),
  y1: z.coerce.number().optional(),
  x2: z.coerce.number().optional(),
  y2: z.coerce.number().optional(),
  bbox: z
    .object({
      x1: z.coerce.number().optional().default(0),
      y1: z.coerce.number().optional().default(0),
      x2: z.coerce.number().optional().default(0),
      y2: z.coerce.number().optional().default(0),
    })
    .optional(),
  model: z.string().optional(),
  modelVersion: z.string().max(100).optional(),
}).transform((box) => {
  const cat = box.category || box.className || 'issue';
  const x1 = Number(box.bbox?.x1 ?? box.x1 ?? 0);
  const y1 = Number(box.bbox?.y1 ?? box.y1 ?? 0);
  const x2 = Number(box.bbox?.x2 ?? box.x2 ?? 0);
  const y2 = Number(box.bbox?.y2 ?? box.y2 ?? 0);
  const conf = box.confidence > 1 ? Number((box.confidence / 100).toFixed(2)) : box.confidence;

  return {
    category: cat,
    className: cat,
    confidence: conf,
    x1,
    y1,
    x2,
    y2,
    bbox: { x1, y1, x2, y2 },
    model: box.model || 'yolo',
    modelVersion: box.modelVersion,
  };
});

export const createComplaintSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.string().min(1, 'Category is required'),
  customCategory: z.string().optional().default(''),
  imageUrl: z.string().url('A successfully uploaded image URL is required').refine((url) => /^https?:\/\//i.test(url), 'Upload the image before submitting'),
  aiDetected: z.boolean().optional().default(false),
  aiClass: z.string().optional().default(''),
  aiConfidence: z.coerce
    .number()
    .optional()
    .default(0)
    .transform((val) => (val > 1 ? Number((val / 100).toFixed(2)) : val)),
  boundingBoxes: z.array(boundingBoxSchema).optional().default([]),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  address: z.string().optional().default('Captured Coordinates'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  analysisToken: z.string().max(50000).optional(),
  uploadToken: z.string().max(5000).optional(),

});

export const updateStatusSchema = z.object({
  status: z.enum(['Pending', 'In Progress', 'Resolved']),
});
