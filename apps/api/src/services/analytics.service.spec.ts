import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ServiceType, ShipmentStatus } from '@oherb-tracker/shared-types';
import { analyticsRangeSchema } from '@oherb-tracker/validation';
import { getAnalyticsOverview, buildAnalyticsPipelines, resolveAnalyticsRange } from './analytics.service.js';
import { Shipment, TrackingEvent } from '@oherb-tracker/database';

const shipmentAggregate = jest.spyOn(Shipment, 'aggregate');
const trackingAggregate = jest.spyOn(TrackingEvent, 'aggregate');

describe('analytics date ranges', () => {
  it('resolves preset ranges from a stable end time', () => {
    const now = new Date('2026-09-14T12:00:00.000Z');
    const range = resolveAnalyticsRange(analyticsRangeSchema.parse({ range: '7d' }), now);
    expect(range.from.toISOString()).toBe('2026-09-07T12:00:00.000Z');
    expect(range.to).toEqual(now);
  });

  it('requires valid custom dates and limits their duration', () => {
    expect(analyticsRangeSchema.safeParse({ range: 'custom' }).success).toBe(false);
    expect(analyticsRangeSchema.safeParse({ range: 'custom', from: '2026-01-01', to: '2026-01-02' }).success).toBe(true);
    expect(analyticsRangeSchema.safeParse({ range: 'custom', from: '2025-01-01', to: '2026-02-01' }).success).toBe(false);
  });
});

describe('analytics aggregation', () => {
  beforeEach(() => {
    shipmentAggregate.mockReset();
    trackingAggregate.mockReset();
  });

  it('uses indexed date fields and disk-backed aggregation for operational scale', async () => {
    const range = resolveAnalyticsRange({ range: '30d' }, new Date('2026-09-14T12:00:00.000Z'));
    const pipelines = buildAnalyticsPipelines(range);
    expect(pipelines.shipment[0]).toEqual({ $match: { createdAt: { $gte: range.from, $lt: range.to } } });
    expect(pipelines.trackingEvent[0]).toEqual({ $match: { timestamp: { $gte: range.from, $lt: range.to } } });

    const shipmentExec = jest.fn<() => Promise<unknown[]>>();
    shipmentExec.mockResolvedValue([{
      overview: [{ totalShipments: 2, activeShipments: 1, deliveredShipments: 1, completedShipments: 2, onTimeDeliveries: 1, lateDeliveries: 0, deliveryDurationSamples: 1, totalDeliveryDays: 2, delaySamples: 1, totalDelayDays: 0, pendingDeliveryEstimate: 1 }],
      statusBreakdown: [{ _id: ShipmentStatus.DELIVERED, count: 1 }],
      serviceBreakdown: [{ _id: ServiceType.EXPRESS, count: 1 }],
      trends: [{ _id: '2026-09-13', shipmentsCreated: 2 }],
    }]);
    const eventExec = jest.fn<() => Promise<unknown[]>>();
    eventExec.mockResolvedValue([{ _id: '2026-09-13', trackingEvents: 3, deliveries: 1 }]);
    const deliveryExec = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([{ _id: '2026-09-14', deliveries: 1 }]);
    shipmentAggregate
      .mockReturnValueOnce({ allowDiskUse: jest.fn().mockReturnThis(), exec: shipmentExec } as never)
      .mockReturnValueOnce({ allowDiskUse: jest.fn().mockReturnThis(), exec: deliveryExec } as never);
    trackingAggregate.mockReturnValue({ allowDiskUse: jest.fn().mockReturnThis(), exec: eventExec } as never);

    const result = await getAnalyticsOverview({ range: '30d' }, new Date('2026-09-14T12:00:00.000Z'));
    expect(result.overview.deliveryRate).toBe(50);
    expect(result.trends).toEqual([
      { date: '2026-09-13', shipmentsCreated: 2, trackingEvents: 3, deliveries: 0 },
      { date: '2026-09-14', shipmentsCreated: 0, trackingEvents: 0, deliveries: 1 },
    ]);
    expect(shipmentAggregate).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ $facet: expect.any(Object) })]));
    expect(shipmentExec).toHaveBeenCalled();
    expect(eventExec).toHaveBeenCalled();
  });
});
