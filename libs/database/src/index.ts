export {
  connectDatabase,
  disconnectDatabase,
  pingDatabase,
  Address,
  Package,
  Shipment,
  TrackingEvent,
  Notification,
  User,
} from './lib/database.js';

export type {
  AddressDocument,
  PackageDocument,
  ShipmentDocument,
  TrackingEventDocument,
  NotificationDocument,
  UserDocument,
} from './lib/models.js';

export { prisma } from './lib/prisma.js';
