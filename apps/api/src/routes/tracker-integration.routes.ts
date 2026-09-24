import { Router } from 'express';
import { trackerApiAuth } from '../middleware/tracker-api-auth.js';
import {
  createTrackerIntegrationShipmentController,
  getTrackerIntegrationShipmentByOrderController,
  getPublicTrackingController,
  getTrackerIntegrationShipmentByTrackingNumberController,
  updateTrackerIntegrationShipmentLocationController,
  updateTrackerIntegrationShipmentStatusController,
} from '../controllers/tracker-integration.controller.js';

const trackerIntegrationRouter = Router();

trackerIntegrationRouter.get(
  '/shipments/track/:trackingNumber',
  getPublicTrackingController(),
);
trackerIntegrationRouter.get('/shipments/tracking/:trackingNumber', trackerApiAuth, getTrackerIntegrationShipmentByTrackingNumberController());
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
trackerIntegrationRouter.patch('/shipments/order/:externalOrderId', trackerApiAuth, updateTrackerIntegrationShipmentLocationController());
trackerIntegrationRouter.patch('/shipments/order/:externalOrderId/status', trackerApiAuth, updateTrackerIntegrationShipmentStatusController());

export default trackerIntegrationRouter;
