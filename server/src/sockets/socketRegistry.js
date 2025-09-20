const userSockets = new Map();
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const trackUserSocket = (userId, socketId) => {
  if (!userId || !socketId) return;
  const key = userId.toString();
  const sockets = userSockets.get(key) || new Set();
  sockets.add(socketId);
  userSockets.set(key, sockets);
};

const untrackUserSocket = (userId, socketId) => {
  if (!userId || !socketId) return;
  const key = userId.toString();
  const sockets = userSockets.get(key);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(key);
  }
};

const emitToRoom = (roomId, event, payload) => {
  if (!ioInstance || !roomId || !event) return;
  ioInstance.to(roomId.toString()).emit(event, payload);
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId || !event) return;
  const sockets = userSockets.get(userId.toString());
  if (!sockets || sockets.size === 0) return;
  sockets.forEach((socketId) => {
    ioInstance.to(socketId).emit(event, payload);
  });
};

module.exports = {
  setIO,
  trackUserSocket,
  untrackUserSocket,
  emitToRoom,
  emitToUser
};
