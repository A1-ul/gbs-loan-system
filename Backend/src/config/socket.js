const { Server } = require('socket.io');
const logger = require('../utils/logger');

let ioInstance = null;

function initSocket(httpServer) {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    path: '/socket.io',
  });

  ioInstance.on('connection', (socket) => {
    const { tenantId, role, isDeveloper } = socket.handshake.query || {};
    if (isDeveloper === 'true') {
      socket.join('developer:landlord');
    }
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }
    if (role) {
      socket.join(`role:${String(role).toUpperCase()}`);
    }
    logger.info(`[Socket.IO] Client connected (${socket.id}) tenant=${tenantId || 'none'} dev=${isDeveloper === 'true'}`);

    socket.on('collector:ping', (payload) => {
      ioInstance.to('developer:landlord').emit('collector:location_update', payload);
      if (payload?.tenantId) {
        ioInstance.to(`tenant:${payload.tenantId}`).emit('collector:location_update', payload);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.IO] Client disconnected (${socket.id})`);
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

function getSocketStats() {
  if (!ioInstance) {
    return { status: 'standby', activeConnections: 0 };
  }
  return {
    status: 'active',
    activeConnections: ioInstance.engine?.clientsCount || 0,
  };
}

function emitToDeveloper(event, payload) {
  if (ioInstance) {
    ioInstance.to('developer:landlord').emit(event, payload);
  }
}

function emitToTenant(tenantId, event, payload) {
  if (ioInstance && tenantId) {
    ioInstance.to(`tenant:${tenantId}`).emit(event, payload);
  }
}

module.exports = {
  initSocket,
  getIO,
  getSocketStats,
  emitToDeveloper,
  emitToTenant,
};

