'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Notification, Shipment, ShipmentStatus, TrackingEvent } from '../api-client';

export type RealtimeConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

type ShipmentSnapshot = Pick<Shipment, 'trackingNumber' | 'status' | 'currentLocation' | 'estimatedDelivery' | 'actualDelivery' | 'updatedAt'> & {
  shipmentId: string;
};

type TrackingEventPayload = { shipmentId: string; event: TrackingEvent & { id?: string } };

function socketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3333`;
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
}

let socket: Socket | undefined;

function getSocket() {
  socket ??= io(socketUrl(), { withCredentials: true, autoConnect: false, reconnection: true });
  return socket;
}

export function useNotificationRealtime(onNotification: (notification: Notification) => void, enabled = true) {
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;
  useEffect(() => {
    if (!enabled) return;
    const currentSocket = getSocket();
    const handler = (payload: unknown) => {
      if (payload && typeof payload === 'object' && 'id' in payload && 'title' in payload) callbackRef.current(payload as Notification);
    };
    currentSocket.on('notification:new', handler);
    if (!currentSocket.connected) currentSocket.connect();
    return () => { currentSocket.off('notification:new', handler); };
  }, [enabled]);
}

function isSnapshot(value: unknown): value is ShipmentSnapshot {
  return Boolean(value && typeof value === 'object' && 'shipmentId' in value && 'status' in value && 'trackingNumber' in value);
}

function isTrackingPayload(value: unknown): value is TrackingEventPayload {
  return Boolean(value && typeof value === 'object' && 'shipmentId' in value && 'event' in value);
}

export function useShipmentRealtime(
  shipmentId: string,
  callbacks: {
    onShipmentChanged: (shipment: ShipmentSnapshot) => void;
    onTrackingEvent: (event: TrackingEvent) => void;
    onReconnect: () => void;
    enabled?: boolean;
  },
) {
  const [state, setState] = useState<RealtimeConnectionState>('disconnected');
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (callbacks.enabled === false) return;
    const currentSocket = getSocket();
    const handleConnect = () => {
      setState('connected');
      currentSocket.emit('shipment:join', { shipmentId });
    };
    const handleDisconnect = () => setState('disconnected');
    const handleConnecting = () => setState('reconnecting');
    const handleConnectError = () => setState('error');
    const handleReconnect = () => {
      setState('connected');
      callbacksRef.current.onReconnect();
    };
    const handleShipmentChanged = (payload: unknown) => {
      if (isSnapshot(payload) && payload.shipmentId === shipmentId) callbacksRef.current.onShipmentChanged(payload);
    };
    const handleTrackingEvent = (payload: unknown) => {
      if (isTrackingPayload(payload) && payload.shipmentId === shipmentId) callbacksRef.current.onTrackingEvent(payload.event);
    };

    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('connecting', handleConnecting);
    currentSocket.on('connect_error', handleConnectError);
    currentSocket.io.on('reconnect', handleReconnect);
    currentSocket.on('shipment:updated', handleShipmentChanged);
    currentSocket.on('shipment:status_changed', handleShipmentChanged);
    currentSocket.on('tracking:event_created', handleTrackingEvent);
    if (!currentSocket.connected) {
      setState('connecting');
      currentSocket.connect();
    } else {
      handleConnect();
    }

    return () => {
      currentSocket.emit('shipment:leave', { shipmentId });
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
      currentSocket.off('connecting', handleConnecting);
      currentSocket.off('connect_error', handleConnectError);
      currentSocket.io.off('reconnect', handleReconnect);
      currentSocket.off('shipment:updated', handleShipmentChanged);
      currentSocket.off('shipment:status_changed', handleShipmentChanged);
      currentSocket.off('tracking:event_created', handleTrackingEvent);
    };
  }, [shipmentId, callbacks.enabled]);

  return state;
}
