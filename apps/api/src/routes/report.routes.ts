import { Router } from 'express';
import { requireAuth, requireRole } from '@oherb-tracker/auth';
import { UserRole } from '@oherb-tracker/shared-types';
import { exportReportController, getReportPreviewController } from '../controllers/report.controller.js';

const reportRouter = Router();
const staffOnly = [requireAuth, requireRole(UserRole.STAFF, UserRole.ADMIN)];

reportRouter.get('/preview', ...staffOnly, getReportPreviewController);
reportRouter.get('/export', ...staffOnly, exportReportController);
reportRouter.get('/:reportType/preview', ...staffOnly, getReportPreviewController);
reportRouter.get('/:reportType/export', ...staffOnly, exportReportController);

export default reportRouter;
