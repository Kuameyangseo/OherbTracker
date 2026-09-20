import { Shipment, TrackingEvent } from '@oherb-tracker/database';
import type { PipelineStage } from 'mongoose';
import { ServiceType, ShipmentStatus, type AnalyticsOverview, type AnalyticsRangeKey } from '@oherb-tracker/shared-types';
import type { AnalyticsRangeInput } from '@oherb-tracker/validation';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = [
  ShipmentStatus.CREATED,
  ShipmentStatus.LABEL_CREATED,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.ARRIVED_AT_FACILITY,
  ShipmentStatus.DEPARTED_FACILITY,
  ShipmentStatus.OUT_FOR_DELIVERY,
];

export type ResolvedAnalyticsRange = {
  key: AnalyticsRangeKey;
  from: Date;
  to: Date;
};

export type AnalyticsPipelines = {
  shipment: PipelineStage[];
  trackingEvent: PipelineStage[];
  delivery: PipelineStage[];
};

function isMidnight(value: Date): boolean {
  return value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0;
}

export function resolveAnalyticsRange(input: AnalyticsRangeInput, now = new Date()): ResolvedAnalyticsRange {
  const end = new Date(now);
  let from: Date;
  let to: Date;

  if (input.range === 'custom') {
    if (!input.from || !input.to) throw new Error('Custom analytics ranges require from and to dates.');
    from = new Date(input.from);
    to = new Date(input.to);
    // Date inputs are inclusive for operators, so include the selected end date.
    if (isMidnight(to)) to = new Date(to.getTime() + DAY_MS);
  } else {
    const days = Number(input.range.replace('d', ''));
    from = new Date(end.getTime() - days * DAY_MS);
    to = end;
  }

  if (from >= to) throw new Error('Analytics range end must be after its start.');
  if (to.getTime() - from.getTime() > 366 * DAY_MS) throw new Error('Analytics ranges cannot exceed 366 days.');
  return { key: input.range, from, to };
}

function rangeMatch(range: ResolvedAnalyticsRange, field: string): PipelineStage.Match {
  return { $match: { [field]: { $gte: range.from, $lt: range.to } } } as PipelineStage.Match;
}

export function buildAnalyticsPipelines(range: ResolvedAnalyticsRange): AnalyticsPipelines {
  const delivered = ShipmentStatus.DELIVERED;
  const completedStatuses = [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED, ShipmentStatus.RETURNED];
  const shipmentMatch = rangeMatch(range, 'createdAt');
  const trackingMatch = rangeMatch(range, 'timestamp');

  return {
    shipment: [
      shipmentMatch,
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalShipments: { $sum: 1 },
                activeShipments: { $sum: { $cond: [{ $in: ['$status', ACTIVE_STATUSES] }, 1, 0] } },
                deliveredShipments: { $sum: { $cond: [{ $eq: ['$status', delivered] }, 1, 0] } },
                completedShipments: { $sum: { $cond: [{ $in: ['$status', completedStatuses] }, 1, 0] } },
                inTransitShipments: { $sum: { $cond: [{ $eq: ['$status', ShipmentStatus.IN_TRANSIT] }, 1, 0] } },
                outForDeliveryShipments: { $sum: { $cond: [{ $eq: ['$status', ShipmentStatus.OUT_FOR_DELIVERY] }, 1, 0] } },
                exceptionShipments: { $sum: { $cond: [{ $eq: ['$status', ShipmentStatus.EXCEPTION] }, 1, 0] } },
                cancelledShipments: { $sum: { $cond: [{ $eq: ['$status', ShipmentStatus.CANCELLED] }, 1, 0] } },
                onTimeDeliveries: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', delivered] }, { $ne: ['$actualDelivery', null] }, { $ne: ['$estimatedDelivery', null] }, { $lte: ['$actualDelivery', '$estimatedDelivery'] }] },
                      1,
                      0,
                    ],
                  },
                },
                lateDeliveries: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', delivered] }, { $ne: ['$actualDelivery', null] }, { $ne: ['$estimatedDelivery', null] }, { $gt: ['$actualDelivery', '$estimatedDelivery'] }] },
                      1,
                      0,
                    ],
                  },
                },
                pendingDeliveryEstimate: {
                  $sum: {
                    $cond: [{ $and: [{ $ne: ['$status', delivered] }, { $ne: ['$estimatedDelivery', null] }] }, 1, 0],
                  },
                },
                totalDeliveryDays: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', delivered] }, { $ne: ['$actualDelivery', null] }, { $ne: ['$createdAt', null] }] },
                      { $divide: [{ $subtract: ['$actualDelivery', '$createdAt'] }, DAY_MS] },
                      0,
                    ],
                  },
                },
                deliveryDurationSamples: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', delivered] }, { $ne: ['$actualDelivery', null] }, { $ne: ['$createdAt', null] }] },
                      1,
                      0,
                    ],
                  },
                },
                totalDelayDays: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', delivered] }, { $ne: ['$actualDelivery', null] }, { $ne: ['$estimatedDelivery', null] }] },
                      { $divide: [{ $subtract: ['$actualDelivery', '$estimatedDelivery'] }, DAY_MS] },
                      0,
                    ],
                  },
                },
                delaySamples: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', delivered] }, { $ne: ['$actualDelivery', null] }, { $ne: ['$estimatedDelivery', null] }] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          statusBreakdown: [{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          serviceBreakdown: [{ $group: { _id: '$serviceType', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
          trends: [
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, shipmentsCreated: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ] as PipelineStage[],
    trackingEvent: [
      trackingMatch,
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: 'UTC' } },
          trackingEvents: { $sum: 1 },
          deliveries: { $sum: { $cond: [{ $eq: ['$status', delivered] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ] as PipelineStage[],
    delivery: [
      { $match: { actualDelivery: { $gte: range.from, $lt: range.to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$actualDelivery', timezone: 'UTC' } }, deliveries: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ] as PipelineStage[],
  };
}

function roundMetric(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) ? 0 : Math.round(value * 100) / 100;
}

export async function getAnalyticsOverview(input: AnalyticsRangeInput, now = new Date()): Promise<AnalyticsOverview> {
  const range = resolveAnalyticsRange(input, now);
  const pipelines = buildAnalyticsPipelines(range);
  const [shipmentResult, eventResult, deliveryResult] = await Promise.all([
    Shipment.aggregate(pipelines.shipment).allowDiskUse(true).exec(),
    TrackingEvent.aggregate(pipelines.trackingEvent).allowDiskUse(true).exec(),
    Shipment.aggregate(pipelines.delivery).allowDiskUse(true).exec(),
  ]);

  const facet = (shipmentResult[0] ?? {}) as {
    overview?: Array<Record<string, number>>;
    statusBreakdown?: Array<{ _id: ShipmentStatus; count: number }>;
    serviceBreakdown?: Array<{ _id: ServiceType; count: number }>;
    trends?: Array<{ _id: string; shipmentsCreated: number }>;
  };
  const overview = facet.overview?.[0] ?? {};
  const eventsByDate = new Map(
    (eventResult as Array<{ _id: string; trackingEvents: number; deliveries: number }>).map((item) => [item._id, item]),
  );
  const deliveriesByDate = new Map(
    (deliveryResult as Array<{ _id: string; deliveries: number }>).map((item) => [item._id, item.deliveries]),
  );
  const trendDates = new Set([...(facet.trends ?? []).map((item) => item._id), ...eventsByDate.keys(), ...deliveriesByDate.keys()]);

  return {
    range: {
      key: range.key,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days: Math.ceil((range.to.getTime() - range.from.getTime()) / DAY_MS),
    },
    overview: {
      totalShipments: overview.totalShipments ?? 0,
      activeShipments: overview.activeShipments ?? 0,
      deliveredShipments: overview.deliveredShipments ?? 0,
      completedShipments: overview.completedShipments ?? 0,
      inTransitShipments: overview.inTransitShipments ?? 0,
      outForDeliveryShipments: overview.outForDeliveryShipments ?? 0,
      exceptionShipments: overview.exceptionShipments ?? 0,
      cancelledShipments: overview.cancelledShipments ?? 0,
      deliveryRate: roundMetric(overview.completedShipments ? ((overview.deliveredShipments ?? 0) / overview.completedShipments) * 100 : 0),
      onTimeDeliveryRate: roundMetric(overview.onTimeDeliveries && overview.onTimeDeliveries + (overview.lateDeliveries ?? 0) ? ((overview.onTimeDeliveries ?? 0) / (overview.onTimeDeliveries + (overview.lateDeliveries ?? 0))) * 100 : 0),
    },
    statusBreakdown: (facet.statusBreakdown ?? []).map((item) => ({ status: item._id, count: item.count })),
    serviceBreakdown: (facet.serviceBreakdown ?? []).map((item) => ({ serviceType: item._id, count: item.count })),
    trends: [...trendDates].sort().map((date) => {
      const created = facet.trends?.find((item) => item._id === date);
      const events = eventsByDate.get(date);
      return { date, shipmentsCreated: created?.shipmentsCreated ?? 0, trackingEvents: events?.trackingEvents ?? 0, deliveries: deliveriesByDate.get(date) ?? 0 };
    }),
    deliveryPerformance: {
      deliveredShipments: overview.deliveredShipments ?? 0,
      onTimeDeliveries: overview.onTimeDeliveries ?? 0,
      lateDeliveries: overview.lateDeliveries ?? 0,
      pendingDeliveryEstimate: overview.pendingDeliveryEstimate ?? 0,
      avgDeliveryDays: overview.deliveryDurationSamples ? roundMetric((overview.totalDeliveryDays ?? 0) / overview.deliveryDurationSamples) : null,
      avgDelayDays: overview.delaySamples ? roundMetric((overview.totalDelayDays ?? 0) / overview.delaySamples) : null,
    },
  };
}
