const createError = require('http-errors');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { verifyToken } = require('../utils/token');
const {
  setIO,
  trackUserSocket,
  untrackUserSocket,
  emitToUser
} = require('./socketRegistry');

const registerSocket = (io) => {
  setIO(io);
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(createError(401, 'Authentication token is required'));
      }
      const user = verifyToken(token);
      socket.user = user;
      return next();
    } catch (error) {
      return next(createError(401, 'Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { username } = socket.user;
    const userId = socket.user.id;
    trackUserSocket(userId, socket.id);
    console.log(`Socket connected: ${socket.id} (${username})`);

    socket.on('joinRoom', async ({ roomId }, callback) => {
      try {
        if (!roomId) {
          throw createError(400, 'roomId is required');
        }

        const room = await Room.findById(roomId);
        if (!room) {
          throw createError(404, 'Room not found');
        }

        const userId = socket.user.id;
        const isOwner = room.owner.toString() === userId;
        const memberIds = room.members.map((memberId) => memberId.toString());
        const isMember = isOwner || memberIds.includes(userId);
        const bannedIds = room.banned.map((bannedId) => bannedId.toString());

        if (bannedIds.includes(userId)) {
          throw createError(403, 'You are banned from this room');
        }

        if (room.type === 'private' && !isMember) {
          throw createError(403, 'You do not have access to this private room');
        }

        if (room.type === 'request' && !isMember) {
          const pendingIds = room.pendingRequests.map((pendingId) => pendingId.toString());
          let requestAdded = false;

          if (!pendingIds.includes(userId)) {
            room.pendingRequests.push(userId);
            requestAdded = true;
            await room.save();

            const notificationPayload = {
              roomId: room._id.toString(),
              roomName: room.name,
              pendingCount: room.pendingRequests.length,
              request: {
                id: userId,
                username
              },
              requestedBy: userId
            };

            const ownerId = room.owner.toString();
            emitToUser(ownerId, 'room:requestCreated', notificationPayload);

            const moderatorIds = Array.isArray(room.moderators)
              ? room.moderators.map((moderatorId) => moderatorId.toString())
              : [];

            moderatorIds
              .filter((moderatorId) => moderatorId !== ownerId)
              .forEach((moderatorId) => {
                emitToUser(moderatorId, 'room:requestCreated', notificationPayload);
              });
          }

          if (callback) {
            callback({ status: 'pending', message: 'Join request sent to the room owner.' });
          }
          return;
        }

        if (!isMember) {
          room.members.push(userId);
          await room.save();
        }

        socket.join(roomId.toString());
        io.to(roomId.toString()).emit('room:userEvent', {
          roomId: room._id.toString(),
          message: `${username} joined the room`
        });
        if (callback) {
          callback({ status: 'joined', message: 'Joined room successfully' });
        }
      } catch (error) {
        if (callback) {
          callback({ status: 'error', message: error.message });
        }
      }
    });

    socket.on('leaveRoom', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomId.toString());
      io.to(roomId.toString()).emit('room:userEvent', {
        roomId: roomId.toString(),
        message: `${username} left the room`
      });
    });

    socket.on('chatMessage', async ({ roomId, text }, callback) => {
      try {
        if (!roomId || !text) {
          throw createError(400, 'roomId and text are required');
        }

        const room = await Room.findById(roomId);
        if (!room) {
          throw createError(404, 'Room not found');
        }

        const userId = socket.user.id;
        const isOwner = room.owner.toString() === userId;
        const isMember = isOwner || room.members.some((memberId) => memberId.toString() === userId);

        if (room.type !== 'public' && !isMember) {
          throw createError(403, 'You do not have permission to send messages to this room');
        }

        const message = await Message.create({
          room: room._id,
          sender: userId,
          text: text.trim()
        });

        await message.populate('sender', 'username');

        io.to(roomId.toString()).emit('room:message', {
          id: message._id,
          text: message.text,
          username: message.sender.username,
          timestamp: message.timestamp,
          roomId: room._id
        });

        if (callback) {
          callback({ status: 'sent' });
        }
      } catch (error) {
        if (callback) {
          callback({ status: 'error', message: error.message });
        }
      }
    });

    socket.on('disconnect', () => {
      untrackUserSocket(userId, socket.id);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = registerSocket;
