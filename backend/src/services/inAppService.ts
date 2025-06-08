import { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketServer(server: Server) {
  io = server;
}

export function sendInApp(to: string, message: string) {
  if (io) {
    io.to(to).emit('notification', { message });
  }
}
