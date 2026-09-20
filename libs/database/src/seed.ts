import bcrypt from 'bcryptjs';
import { ServiceType, ShipmentStatus, UserRole } from '@oherb-tracker/shared-types';
import {
  Address,
  connectDatabase,
  disconnectDatabase,
  Shipment,
  TrackingEvent,
  User,
} from './index.js';

const seedPassword = 'Login@@12';

const users = [
  { name: 'Kuame Yangseo', email: 'iamyangseo@gmail.com', role: UserRole.ADMIN },
  { name: 'Abigail Klima', email: 'abigailklima6@gmail.com', role: UserRole.STAFF },
  { name: 'Josphine Dumos', email: 'dumosphine@gmail.com', role: UserRole.CUSTOMER },
];

const shipmentFixtures = [
  [ShipmentStatus.CREATED, ServiceType.STANDARD],
  [ShipmentStatus.PICKED_UP, ServiceType.EXPRESS],
  [ShipmentStatus.IN_TRANSIT, ServiceType.STANDARD],
  [ShipmentStatus.ARRIVED_AT_FACILITY, ServiceType.EXPRESS],
  [ShipmentStatus.OUT_FOR_DELIVERY, ServiceType.OVERNIGHT],
  [ShipmentStatus.DELIVERED, ServiceType.STANDARD],
  [ShipmentStatus.EXCEPTION, ServiceType.EXPRESS],
] as const;

async function seed() {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const seededUsers = new Map<string, string>();

  for (const user of users) {
    const saved = await User.findOneAndUpdate(
      { email: user.email },
      { $set: { ...user, passwordHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    seededUsers.set(user.email, saved.id);
  }

  const customerIds = [...seededUsers.entries()]
    .filter(([email]) => email.endsWith('@swifttrack.test') && !email.startsWith('admin') && !email.startsWith('staff'))
    .map(([, id]) => id);

  for (let index = 0; index < shipmentFixtures.length; index += 1) {
    const [status, serviceType] = shipmentFixtures[index];
    const trackingNumber = `ST${String(index + 1).padStart(9, '0')}GH`;
    const origin = await Address.findOneAndUpdate(
      { addressLine1: `${index + 1} Meridian Way`, city: 'Accra' },
      {
        name: 'SwiftTrack Origin Hub',
        phone: '+233-000-000-000',
        addressLine1: `${index + 1} Meridian Way`,
        city: 'Accra',
        state: 'Greater Accra',
        postalCode: 'GA-000-0000',
        country: 'Ghana',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const destination = await Address.findOneAndUpdate(
      { addressLine1: `${index + 10} Horizon Road`, city: 'Kumasi' },
      {
        name: 'SwiftTrack Destination',
        phone: '+233-000-000-001',
        addressLine1: `${index + 10} Horizon Road`,
        city: 'Kumasi',
        state: 'Ashanti',
        postalCode: 'AK-000-0000',
        country: 'Ghana',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const shipment = await Shipment.findOneAndUpdate(
      { trackingNumber },
      {
        customerId: customerIds[index % customerIds.length],
        status,
        serviceType,
        originAddressId: origin.id,
        destinationAddressId: destination.id,
        estimatedDelivery: new Date(Date.now() + (index + 2) * 86_400_000),
        actualDelivery: status === ShipmentStatus.DELIVERED ? new Date() : undefined,
        weight: 1.5 + index,
        description: 'Development shipment fixture',
        currentLocation: { name: 'Kumasi Facility', city: 'Kumasi', country: 'Ghana' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const eventStatuses = [ShipmentStatus.CREATED, ShipmentStatus.LABEL_CREATED, status];
    for (let eventIndex = 0; eventIndex < eventStatuses.length; eventIndex += 1) {
      await TrackingEvent.findOneAndUpdate(
        { shipmentId: shipment.id, status: eventStatuses[eventIndex], timestamp: new Date(2026, 0, index + eventIndex + 1) },
        {
          shipmentId: shipment.id,
          status: eventStatuses[eventIndex],
          description: `${eventStatuses[eventIndex].replaceAll('_', ' ').toLowerCase()} for development fixture`,
          location: 'SwiftTrack Facility',
          city: eventIndex === 0 ? 'Accra' : 'Kumasi',
          country: 'Ghana',
          timestamp: new Date(2026, 0, index + eventIndex + 1),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }
}

seed()
  .then(async () => {
    console.log('MongoDB development seed complete.');
    await disconnectDatabase();
  })
  .catch(async (error: unknown) => {
    console.error('MongoDB development seed failed.', error);
    await disconnectDatabase();
    process.exitCode = 1;
  });