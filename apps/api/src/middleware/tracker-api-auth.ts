import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { serverConfig } from '@oherb-tracker/config';

export function trackerApiAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const authorization = request.header('authorization');
  const expectedKey = serverConfig.trackerApiKey;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!expectedKey || !match) {
    response.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid Tracker API credentials are required.',
      },
    });
    return;
  }

  const suppliedKey = match[1];
  const suppliedBuffer = Buffer.from(suppliedKey);
  const expectedBuffer = Buffer.from(expectedKey);
  const valid =
    suppliedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);

  if (!valid) {
    response.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid Tracker API credentials are required.',
      },
    });
    return;
  }

  next();
}
