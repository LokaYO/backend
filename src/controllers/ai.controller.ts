import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { BusinessInfo, BusinessInfoSchema } from '../types/schema.js';
import { generateWebsiteWithGemini } from '../services/ai.service.js';

export async function generateWebsite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parseResult = BusinessInfoSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Data bisnis tidak valid',
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const businessInfo = parseResult.data as unknown as BusinessInfo;
  const generatedData = await generateWebsiteWithGemini(businessInfo);

  res.json({
    success: true,
    data: generatedData,
  });
}

