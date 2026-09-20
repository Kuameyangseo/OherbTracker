import { Router } from 'express';
import { requireAuth, requireRole } from '@oherb-tracker/auth';
import { UserRole } from '@oherb-tracker/shared-types';
import {
  createTrackingEventController,
  getPublicTrackingController,
  getShipmentEventsController,
  updateShipmentStatusController,
} from '../controllers/tracking.controller.js';

const trackingRouter = Router();

trackingRouter.get('/track/:trackingNumber', getPublicTrackingController);
trackingRouter.get('/:id/events', requireAuth, getShipmentEventsController);
trackingRouter.post('/:id/events', requireAuth, requireRole(UserRole.STAFF, UserRole.ADMIN), createTrackingEventController);
trackingRouter.patch('/:id/status', requireAuth, requireRole(UserRole.STAFF, UserRole.ADMIN), updateShipmentStatusController);

export default trackingRouter;
