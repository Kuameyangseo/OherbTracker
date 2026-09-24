import { z } from 'zod';
import {
  OperationalReportType,
  PackageDimensionUnit,
  PackageType,
  PackageWeightUnit,
  ServiceType,
  ShipmentStatus,
} from '@oherb-tracker/shared-types';

export const trackingNumberSchema = z
  .string()
  .trim()
  .min(4)
  .max(40)
  .regex(/^[A-Za-z0-9-]+$/, 'Tracking number contains invalid characters');

export const emailSchema = z.string().trim().email();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const addressSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(4).max(30),
    addressLine1: z.string().trim().min(2).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().min(2).max(30),
    country: z.string().trim().min(2).max(100),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
  })
  .refine(
    (value) =>
      (value.latitude === undefined) === (value.longitude === undefined),
    {
      message: 'Latitude and longitude must be provided together',
      path: ['latitude'],
    },
  );

export const shipmentStatusSchema = z.enum([
  'CREATED',
  'LABEL_CREATED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'AT_ORIGIN_FACILITY',
  'IN_TRANSIT',
  'ARRIVED_AT_FACILITY',
  'DEPARTED_FACILITY',
  'AT_DESTINATION_FACILITY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_ATTEMPTED',
  'EXCEPTION',
  'CANCELLED',
  'RETURNED',
]);

export const serviceTypeSchema = z.enum(['STANDARD', 'EXPRESS', 'OVERNIGHT']);

const integrationAddressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(4).max(30),
  email: emailSchema.optional(),
  addressLine1: z.string().trim().min(2).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().min(2).max(30),
  country: z.string().trim().min(2).max(100),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
}).refine(
  (value) => (value.latitude === undefined) === (value.longitude === undefined),
  'Latitude and longitude must be provided together',
);

const integrationUnit = <T extends string>(values: readonly T[]) =>
  z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.enum(values as [T, ...T[]]));

export const trackerIntegrationShipmentSchema = z.object({
  externalOrderId: z.string().trim().min(1).max(160),
  externalCustomerId: z.string().trim().min(1).max(160),
  externalSellerId: z.string().trim().min(1).max(160),
  seller: integrationAddressSchema,
  carrier: z.literal('OherbTracker'),
  trackingNumber: z.string().trim().min(4).max(80).optional(),
  labelUrl: z.string().url().max(2000).optional(),
  service: serviceTypeSchema,
  notifyStaff: z.boolean().optional().default(false),
    currentLocation: z.object({
      name: z.string().trim().min(1).max(120),
      city: z.string().trim().min(1).max(100),
      country: z.string().trim().min(2).max(100),
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
    }).optional(),
  sender: integrationAddressSchema,
  recipient: integrationAddressSchema,
  package: z.object({
    weight: z.number().finite().nonnegative(),
    weightUnit: integrationUnit(['KG', 'LB'] as const),
    dimensions: z.object({
      length: z.number().finite().nonnegative(),
      width: z.number().finite().nonnegative(),
      height: z.number().finite().nonnegative(),
    }),
    dimensionUnit: integrationUnit(['CM', 'IN'] as const),
    packageType: z.nativeEnum(PackageType).optional(),
    description: z.string().trim().max(2000).optional(),
  }),
});

export const shipmentCreateSchema = z.object({
  customerId: z.string().trim().min(1),
  externalOrderId: z.string().trim().min(1).max(160).optional(),
  externalCustomerId: z.string().trim().min(1).max(160).optional(),
  externalSellerId: z.string().trim().min(1).max(160).optional(),
  serviceType: serviceTypeSchema,
  origin: addressSchema,
  destination: addressSchema,
  weight: z.number().finite().positive().max(10000).optional(),
  description: z.string().trim().max(2000).optional(),
  estimatedDelivery: z.coerce.date().optional(),
});

export const shipmentUpdateSchema = z
  .object({
    serviceType: serviceTypeSchema.optional(),
    origin: addressSchema.optional(),
    destination: addressSchema.optional(),
    estimatedDelivery: z.coerce.date().nullable().optional(),
    weight: z.number().finite().positive().max(10000).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    currentLocation: z
      .object({
        name: z.string().trim().min(1).max(120),
        city: z.string().trim().min(1).max(100),
        country: z.string().trim().min(2).max(100),
        latitude: z.number().finite().min(-90).max(90).optional(),
        longitude: z.number().finite().min(-180).max(180).optional(),
      })
      .refine(
        (value) =>
          (value.latitude === undefined) === (value.longitude === undefined),
        'Latitude and longitude must be provided together',
      )
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one update field is required',
  );

export const shipmentQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: shipmentStatusSchema.optional(),
  serviceType: serviceTypeSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'estimatedDelivery',
      'trackingNumber',
      'status',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const shipmentIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid shipment id');

export const packageNumberSchema = z
  .string()
  .trim()
  .min(4)
  .max(60)
  .regex(/^[A-Za-z0-9-]+$/, 'Package number contains invalid characters');
export const packageIdSchema = shipmentIdSchema;
export const packageWeightUnitSchema = z.nativeEnum(PackageWeightUnit);
export const packageDimensionUnitSchema = z.nativeEnum(PackageDimensionUnit);
export const packageTypeSchema = z.nativeEnum(PackageType);
export const packageDimensionsSchema = z.object({
  length: z.number().finite().nonnegative(),
  width: z.number().finite().nonnegative(),
  height: z.number().finite().nonnegative(),
});
export const packageCreateSchema = z.object({
  shipmentId: shipmentIdSchema,
  trackingNumber: trackingNumberSchema,
  weight: z.number().finite().nonnegative(),
  weightUnit: packageWeightUnitSchema,
  dimensions: packageDimensionsSchema,
  dimensionUnit: packageDimensionUnitSchema,
  packageType: packageTypeSchema.optional(),
  description: z.string().trim().max(2000).optional(),
  status: shipmentStatusSchema,
});
export const packageUpdateSchema = packageCreateSchema
  .omit({ shipmentId: true, trackingNumber: true })
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    'At least one update field is required',
  );

export const analyticsRangeSchema = z
  .object({
    range: z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .superRefine((value, context) => {
    if (value.range === 'custom') {
      if (!value.from)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['from'],
          message: 'A start date is required.',
        });
      if (!value.to)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['to'],
          message: 'An end date is required.',
        });
      if (value.from && value.to && value.from > value.to) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['to'],
          message: 'End date must be after start date.',
        });
      }
      if (
        value.from &&
        value.to &&
        value.to.getTime() - value.from.getTime() > 366 * 24 * 60 * 60 * 1000
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['to'],
          message: 'Custom ranges cannot exceed 366 days.',
        });
      }
    } else if (value.from || value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['range'],
        message: 'Start and end dates are only valid for a custom range.',
      });
    }
  });

export const operationalReportTypeSchema = z.nativeEnum(OperationalReportType);
export const reportTypeSchema = operationalReportTypeSchema;

export const operationalReportQuerySchema = z
  .object({
    reportType: operationalReportTypeSchema,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    status: z.nativeEnum(ShipmentStatus).optional(),
    serviceType: z.nativeEnum(ServiceType).optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'End date must be after start date.',
      });
    }
    if (
      value.from &&
      value.to &&
      value.to.getTime() - value.from.getTime() > 366 * 24 * 60 * 60 * 1000
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'Report ranges cannot exceed 366 days.',
      });
    }
  });
export const reportQuerySchema = operationalReportQuerySchema;

const trackingTimestampSchema = z.coerce
  .date()
  .refine(
    (value) => value.getTime() <= Date.now() + 5 * 60 * 1000,
    'Timestamp cannot be in the future',
  );

export const trackingEventSchema = z
  .object({
    packageId: packageIdSchema.optional(),
    trackingNumber: trackingNumberSchema.optional(),
    status: shipmentStatusSchema,
    description: z.string().trim().min(2).max(500),
    location: z.string().trim().min(2).max(160),
    city: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(100),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    timestamp: trackingTimestampSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      (value.latitude === undefined) === (value.longitude === undefined),
    {
      message: 'Latitude and longitude must be provided together',
      path: ['latitude'],
    },
  );

export const shipmentStatusUpdateSchema = trackingEventSchema;

export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>;
export type TrackerIntegrationShipmentInput = z.infer<
  typeof trackerIntegrationShipmentSchema
>;
export type PackageCreateInput = z.infer<typeof packageCreateSchema>;
export type PackageUpdateInput = z.infer<typeof packageUpdateSchema>;
export type ShipmentUpdateInput = z.infer<typeof shipmentUpdateSchema>;
export type ShipmentQuery = z.infer<typeof shipmentQuerySchema>;
export type TrackingEventInput = z.infer<typeof trackingEventSchema>;
export type ShipmentStatusUpdateInput = z.infer<
  typeof shipmentStatusUpdateSchema
>;
export type AnalyticsRangeInput = z.infer<typeof analyticsRangeSchema>;
export type OperationalReportQuery = z.infer<
  typeof operationalReportQuerySchema
>;
