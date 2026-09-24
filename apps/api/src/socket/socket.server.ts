import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { z } from 'zod';
import { serverConfig } from '@oherb-tracker/config';
import { getShipmentById } from '../services/shipment.service.js';
import { setSocketServer } from './socket.publisher.js';
import { authenticateSocket } from './socket.auth.js';
import { shipmentRoom, socketEvents, userRoom } from './socket.events.js';

const shipmentRoomPayload = z.object({ shipmentId: z.string().min(1).max(100) });

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        callback(null, serverConfig.webUrls.includes(origin));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      socket.data.user = authenticateSocket(socket.handshake);
      next();
    } catch {
      next(new Error('Authentication required.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; email: string; role: 'CUSTOMER' | 'SELLER' | 'STAFF' | 'ADMIN' };
    console.log('[socket] connected', { socketId: socket.id, userId: user.id, role: user.role });
    void socket.join(userRoom(user.id));

    socket.on(socketEvents.joinShipment, async (payload: unknown, acknowledge?: (response: { ok: boolean; error?: string }) => void) => {
      const parsed = shipmentRoomPayload.safeParse(payload);
      if (!parsed.success) return acknowledge?.({ ok: false, error: 'Invalid shipment id.' });
      try {
        await getShipmentById(parsed.data.shipmentId, user);
        await socket.join(shipmentRoom(parsed.data.shipmentId));
        console.log('[socket] shipment room joined', { socketId: socket.id, shipmentId: parsed.data.shipmentId });
        acknowledge?.({ ok: true });
      } catch {
        acknowledge?.({ ok: false, error: 'Shipment access denied.' });
      }
    });

    socket.on(socketEvents.leaveShipment, async (payload: unknown) => {
      const parsed = shipmentRoomPayload.safeParse(payload);
      if (!parsed.success) return;
      await socket.leave(shipmentRoom(parsed.data.shipmentId));
      console.log('[socket] shipment room left', { socketId: socket.id, shipmentId: parsed.data.shipmentId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected', { socketId: socket.id, reason });
    });
  });

  setSocketServer(io);
  return io;
}
