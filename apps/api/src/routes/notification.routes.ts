import { Router } from 'express';
import { requireAuth } from '@oherb-tracker/auth';
import {
  getPreferencesController, listNotificationsController, markAllReadController, markReadController,
  unreadCountController, updatePreferencesController,
} from '../controllers/notification.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/', listNotificationsController);
router.get('/unread-count', unreadCountController);
router.patch('/read-all', markAllReadController);
router.patch('/:id/read', markReadController);
router.get('/preferences', getPreferencesController);
router.patch('/preferences', updatePreferencesController);
export default router;
