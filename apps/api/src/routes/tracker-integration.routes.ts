import { Router } from 'express';
import { trackerApiAuth } from '../middleware/tracker-api-auth.js';
import {
  createTrackerIntegrationShipmentController,
  getTrackerIntegrationShipmentByOrderController,
  getPublicTrackingController,
} from '../controllers/tracker-integration.controller.js';

const trackerIntegrationRouter = Router();

trackerIntegrationRouter.get(
  '/shipments/track/:trackingNumber',
  getPublicTrackingController(),
);
trackerIntegrationRouter.post(
  '/shipments',
  trackerApiAuth,
  createTrackerIntegrationShipmentController(),
);
trackerIntegrationRouter.get(
  '/shipments/order/:externalOrderId',
  trackerApiAuth,
  getTrackerIntegrationShipmentByOrderController(),
);

export default trackerIntegrationRouter;
