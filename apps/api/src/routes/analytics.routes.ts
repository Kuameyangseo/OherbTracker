import { Router } from 'express';
import { requireAuth, requireRole } from '@oherb-tracker/auth';
import { UserRole } from '@oherb-tracker/shared-types';
import { getAnalyticsOverviewController } from '../controllers/analytics.controller.js';

const analyticsRouter = Router();

analyticsRouter.get('/overview', requireAuth, requireRole(UserRole.STAFF, UserRole.ADMIN), getAnalyticsOverviewController);

export default analyticsRouter;
