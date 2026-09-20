import type { Request, Response } from 'express';
import { analyticsRangeSchema } from '@oherb-tracker/validation';
import { getAnalyticsOverview } from '../services/analytics.service.js';

function validationDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.map(String).join('.') || 'request', issue.message]));
}

export async function getAnalyticsOverviewController(request: Request, response: Response) {
  const parsed = analyticsRangeSchema.safeParse(request.query);
  if (!parsed.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid analytics date range.', details: validationDetails(parsed.error) },
    });
  }

  const overview = await getAnalyticsOverview(parsed.data);
  return response.status(200).json({ success: true, data: overview });
}
