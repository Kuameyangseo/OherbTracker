import mongoose, {
  Schema,
  model,
  type InferSchemaType,
  type Model,
} from 'mongoose';
import {
  PackageDimensionUnit,
  PackageType,
  PackageWeightUnit,
  ServiceType,
  ShipmentStatus,
  UserRole,
} from '@oherb-tracker/shared-types';

const coordinatesSchema = new Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      index: true,
    },
    phone: { type: String, trim: true },
    notificationPreferences: {
      inApp: {
        shipmentStatus: { type: Boolean, default: true },
      },
      email: {
        shipmentStatus: { type: Boolean, default: true },
      },
      sms: {
        shipmentStatus: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true },
);

const addressSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: true },
);

const shipmentSchema = new Schema(
  {
    shipmentNumber: { type: String, trim: true },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    externalOrderId: { type: String, trim: true },
    externalCustomerId: { type: String, trim: true, index: true },
    externalSellerId: { type: String, trim: true, index: true },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ShipmentStatus),
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: Object.values(ServiceType),
      required: true,
    },
    originAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'Address',
    },
    destinationAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'Address',
    },
    packageIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Package' }],
      default: [],
    },
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date },
    weight: { type: Number, min: 0 },
    description: { type: String, trim: true },
    currentLocation: { type: coordinatesSchema },
  },
  { timestamps: true },
);
shipmentSchema.index({ createdAt: -1 });
shipmentSchema.index({ actualDelivery: 1 });
shipmentSchema.index({ shipmentNumber: 1 }, { unique: true, sparse: true });
shipmentSchema.index({ externalOrderId: 1 }, { unique: true, sparse: true });
shipmentSchema.virtual('customer', {
  ref: 'User',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true,
});
shipmentSchema.virtual('originAddress', {
  ref: 'Address',
  localField: 'originAddressId',
  foreignField: '_id',
  justOne: true,
});
shipmentSchema.virtual('destinationAddress', {
  ref: 'Address',
  localField: 'destinationAddressId',
  foreignField: '_id',
  justOne: true,
});
shipmentSchema.virtual('trackingEvents', {
  ref: 'TrackingEvent',
  localField: '_id',
  foreignField: 'shipmentId',
  justOne: false,
});
shipmentSchema.virtual('packages', {
  ref: 'Package',
  localField: 'packageIds',
  foreignField: '_id',
  justOne: false,
});
shipmentSchema.set('toObject', { virtuals: true });
shipmentSchema.set('toJSON', { virtuals: true });

const trackingEventSchema = new Schema(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
    packageId: { type: Schema.Types.ObjectId, ref: 'Package', index: true },
    trackingNumber: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: Object.values(ShipmentStatus),
      required: true,
    },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const packageDimensionsSchema = new Schema(
  {
    length: { type: Number, required: true, min: 0 },
    width: { type: Number, required: true, min: 0 },
    height: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const packageSchema = new Schema(
  {
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
      index: true,
    },
    packageNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    weight: { type: Number, required: true, min: 0 },
    weightUnit: {
      type: String,
      enum: Object.values(PackageWeightUnit),
      required: true,
    },
    dimensions: { type: packageDimensionsSchema, required: true },
    dimensionUnit: {
      type: String,
      enum: Object.values(PackageDimensionUnit),
      required: true,
    },
    packageType: { type: String, enum: Object.values(PackageType) },
    description: { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: Object.values(ShipmentStatus),
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);
packageSchema.index({ shipmentId: 1, createdAt: 1 });
const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', index: true },
    trackingNumber: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    delivery: {
      email: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'skipped'],
        },
        sentAt: { type: Date },
        failedAt: { type: Date },
        errorCode: { type: String },
      },
      sms: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'skipped'],
        },
        sentAt: { type: Date },
        failedAt: { type: Date },
        errorCode: { type: String },
      },
    },
  },
  { timestamps: true },
);
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
trackingEventSchema.index({ shipmentId: 1, timestamp: -1 });
trackingEventSchema.index(
  { shipmentId: 1, status: 1, timestamp: 1 },
  { unique: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export type AddressDocument = InferSchemaType<typeof addressSchema>;
export type ShipmentDocument = InferSchemaType<typeof shipmentSchema>;
export type TrackingEventDocument = InferSchemaType<typeof trackingEventSchema>;
export type PackageDocument = InferSchemaType<typeof packageSchema>;
export type NotificationDocument = InferSchemaType<typeof notificationSchema>;

export const User =
  (mongoose.models.User as Model<UserDocument>) ||
  model<UserDocument>('User', userSchema);
export const Address =
  (mongoose.models.Address as Model<AddressDocument>) ||
  model<AddressDocument>('Address', addressSchema);
export const Shipment =
  (mongoose.models.Shipment as Model<ShipmentDocument>) ||
  model<ShipmentDocument>('Shipment', shipmentSchema);
export const TrackingEvent =
  (mongoose.models.TrackingEvent as Model<TrackingEventDocument>) ||
  model<TrackingEventDocument>('TrackingEvent', trackingEventSchema);
export const Package =
  (mongoose.models.Package as Model<PackageDocument>) ||
  model<PackageDocument>('Package', packageSchema);
export const Notification =
  (mongoose.models.Notification as Model<NotificationDocument>) ||
  model<NotificationDocument>('Notification', notificationSchema);
