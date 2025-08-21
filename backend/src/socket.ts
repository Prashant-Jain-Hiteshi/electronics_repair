import { Server as IOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

let io: IOServer | null = null;

export function initSocket(server: HTTPServer) {
  io = new IOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      const headerToken = (socket.handshake.headers['authorization'] as string | undefined) || '';
      const bearerToken = headerToken.startsWith('Bearer ') ? headerToken.slice(7) : undefined;
      const finalToken = token || bearerToken;
      if (!finalToken) {
        socket.disconnect(true);
        return;
      }
      const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
      const payload = jwt.verify(finalToken, secret) as any;
      const userId = payload?.id as string | undefined;
      if (!userId) {
        socket.disconnect(true);
        return;
      }
      // Join a per-user room to target notifications
      socket.join(`user:${userId}`);

      // Debug: log successful connection
      try {
        console.log(`[socket] connected sid=${socket.id} userId=${userId}`);
      } catch {}

      socket.emit('socket:ready', { ok: true });

      socket.on('disconnect', () => {
        // Debug: log disconnect
        try {
          console.log(`[socket] disconnected sid=${socket.id}`);
        } catch {}
      });
    } catch (err) {
      socket.disconnect(true);
    }
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized');
  return io;
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (!io) return;
  // Debug: log emission
  try {
    console.log(`[socket] emit to user:${userId} event=${event} payloadKeys=${Object.keys(payload || {}).join(',')}`);
  } catch {}
  io.to(`user:${userId}`).emit(event, payload);
}

