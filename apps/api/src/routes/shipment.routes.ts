import { Router } from 'express';
import { requireAuth, requireRole } from '@oherb-tracker/auth';
import { UserRole } from '@oherb-tracker/shared-types';
import {
  createShipmentController,
  deleteShipmentController,
  getShipmentController,
  listShipmentsController,
  updateShipmentController,
} from '../controllers/shipment.controller.js';

const shipmentRouter = Router();

shipmentRouter.post('/', requireAuth, requireRole(UserRole.STAFF, UserRole.ADMIN), createShipmentController);
shipmentRouter.get('/', requireAuth, listShipmentsController);
shipmentRouter.get('/:id', requireAuth, getShipmentController);
shipmentRouter.patch('/:id', requireAuth, requireRole(UserRole.STAFF, UserRole.ADMIN), updateShipmentController);
shipmentRouter.delete('/:id', requireAuth, requireRole(UserRole.ADMIN), deleteShipmentController);

export default shipmentRouter;
