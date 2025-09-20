const createError = require('http-errors');
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const { emitToUser } = require('../sockets/socketRegistry');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return normalizeId(value._id);
  return value.toString();
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatRoom = (room, currentUserId, extras = {}) => {
  const memberIds = Array.isArray(room.members)
    ? room.members.map((member) => normalizeId(member)).filter(Boolean)
    : [];
  const ownerId = normalizeId(room.owner);
  const userId = currentUserId ? currentUserId.toString() : null;
  const isOwner = userId ? ownerId === userId : false;
  const isMember = userId ? isOwner || memberIds.includes(userId) : false;

  return {
    id: room._id,
    name: room.name,
    description: room.description,
    type: room.type,
    owner: room.owner?.username || normalizeId(room.owner),
    memberCount: memberIds.length,
    pendingCount: room.pendingRequests?.length || 0,
    isOwner,
    isMember,
    hasPendingRequest: extras.hasPendingRequest ?? false,
    lastMessage: extras.lastMessage || null,
    lastActivity: extras.lastActivity || room.updatedAt || room.createdAt,
    createdAt: room.createdAt
  };
};

const getLastMessagesForRooms = async (roomIds) => {
  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    return new Map();
  }

  const lastMessages = await Message.aggregate([
    { $match: { room: { $in: roomIds } } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$room',
        messageId: { $first: '$_id' },
        text: { $first: '$text' },
        timestamp: { $first: '$timestamp' },
        senderId: { $first: '$sender' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'senderId',
        foreignField: '_id',
        as: 'sender'
      }
    },
    {
      $addFields: {
        sender: { $arrayElemAt: ['$sender', 0] }
      }
    }
  ]);

  const byRoomId = new Map();
  lastMessages.forEach((entry) => {
    const key = normalizeId(entry._id);
    byRoomId.set(key, {
      id: normalizeId(entry.messageId),
      text: entry.text,
      timestamp: entry.timestamp,
      sender: entry.sender ? entry.sender.username : null,
      senderId: entry.sender ? normalizeId(entry.sender._id) : null
    });
  });

  return byRoomId;
};

exports.listRooms = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id;

  const publicRooms = await Room.find({ type: { $in: ['public', 'request'] } })
    .sort({ name: 1 })
    .populate('owner', 'username')
    .populate('members', '_id');

  let rooms = [...publicRooms];

  if (currentUserId) {
    const memberRooms = await Room.find({
      type: 'private',
      $or: [{ owner: currentUserId }, { members: currentUserId }]
    })
      .sort({ name: 1 })
      .populate('owner', 'username')
      .populate('members', '_id');

    rooms = rooms.concat(memberRooms);
  }

  const uniqueRooms = new Map();
  rooms.forEach((room) => {
    uniqueRooms.set(room._id.toString(), room);
  });

  const formatted = Array.from(uniqueRooms.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((room) => formatRoom(room, currentUserId));

  res.json({ rooms: formatted });
});

exports.getJoinedRooms = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id;

  if (!currentUserId) {
    throw createError(401, 'Authentication required');
  }

  const search = (req.query.search || '').trim();

  const filter = {
    $or: [{ owner: currentUserId }, { members: currentUserId }]
  };

  if (search) {
    filter.name = { $regex: new RegExp(escapeRegex(search), 'i') };
  }

  const rooms = await Room.find(filter)
    .populate('owner', 'username')
    .lean();

  const roomIds = rooms.map((room) => room._id);
  const lastMessages = await getLastMessagesForRooms(roomIds);

  const formatted = rooms
    .map((room) => {
      const lastMessage = lastMessages.get(normalizeId(room._id));
      const lastActivity = lastMessage?.timestamp || room.updatedAt || room.createdAt;
      return formatRoom(room, currentUserId, {
        lastMessage: lastMessage || null,
        lastActivity
      });
    })
    .sort((a, b) => {
      const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return dateB - dateA;
    });

  res.json({ rooms: formatted });
});

exports.discoverRooms = asyncHandler(async (req, res) => {
  const currentUserId = req.user?.id || null;
  const search = (req.query.search || '').trim();
  const requestedType = (req.query.type || '').toLowerCase();

  const allowedTypes = ['public', 'request'];
  const filter = { type: { $in: allowedTypes } };

  if (requestedType && allowedTypes.includes(requestedType)) {
    filter.type = requestedType;
  }

  if (search) {
    filter.name = { $regex: new RegExp(escapeRegex(search), 'i') };
  }

  const rooms = await Room.find(filter)
    .sort({ name: 1 })
    .populate('owner', 'username')
    .lean();

  const formatted = rooms.map((room) => {
    const pendingIds = Array.isArray(room.pendingRequests)
      ? room.pendingRequests.map((userId) => normalizeId(userId))
      : [];

    return formatRoom(room, currentUserId, {
      hasPendingRequest: currentUserId ? pendingIds.includes(currentUserId.toString()) : false
    });
  });

  res.json({ rooms: formatted });
});

exports.createRoom = asyncHandler(async (req, res) => {
  const { name, description = '', type = 'public' } = req.body;

  if (!name) {
    throw createError(400, 'Room name is required');
  }

  if (!['public', 'private', 'request'].includes(type)) {
    throw createError(400, 'Invalid room type');
  }

  const lowerName = name.trim();
  const existingRoom = await Room.findOne({ name: lowerName });
  if (existingRoom) {
    throw createError(409, 'Room name already exists');
  }

  const room = await Room.create({
    name: lowerName,
    description,
    type,
    owner: req.user.id,
    members: [req.user.id]
  });

  await room.populate('owner', 'username');

  res.status(201).json({
    message: 'Room created successfully',
    room: formatRoom(room, req.user.id)
  });
});

exports.getPendingRequests = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId)
    .populate('owner', 'username')
    .populate('pendingRequests', 'username');

  if (!room) {
    throw createError(404, 'Room not found');
  }

  if (room.owner._id.toString() !== req.user.id) {
    throw createError(403, 'You do not have permission to manage this room');
  }

  if (room.type !== 'request') {
    throw createError(400, 'This room does not use join requests');
  }

  const requests = room.pendingRequests.map((user) => ({
    id: user._id,
    username: user.username
  }));

  res.json({
    room: formatRoom(room, req.user.id),
    requests
  });
});

exports.handleJoinRequest = asyncHandler(async (req, res) => {
  const { action, userId } = req.body;
  const room = await Room.findById(req.params.roomId);

  if (!room) {
    throw createError(404, 'Room not found');
  }

  if (room.owner.toString() !== req.user.id) {
    throw createError(403, 'You do not have permission to manage this room');
  }

  if (room.type !== 'request') {
    throw createError(400, 'This room does not use join requests');
  }

  if (!['approve', 'deny'].includes(action)) {
    throw createError(400, 'Invalid action');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw createError(404, 'Target user not found');
  }

  const pendingIds = room.pendingRequests.map((pendingId) => pendingId.toString());
  if (!pendingIds.includes(userId)) {
    throw createError(404, 'No pending request found for this user');
  }

  room.pendingRequests = room.pendingRequests.filter((pendingId) => pendingId.toString() !== userId);

  if (action === 'approve') {
    const existingMembers = room.members.map((memberId) => memberId.toString());
    if (!existingMembers.includes(userId)) {
      room.members.push(userId);
    }
  }

  await room.save();

  await room.populate('owner', 'username');
  await room.populate('members', '_id');

  const ownerId = normalizeId(room.owner);
  const pendingCount = room.pendingRequests.length;
  const basePayload = {
    roomId: room._id.toString(),
    roomName: room.name,
    pendingCount,
    memberCount: room.members.length,
    request: {
      id: userId,
      username: targetUser.username
    },
    action,
    performedBy: req.user.id
  };

  emitToUser(ownerId, 'room:requestResolved', basePayload);

  if (action === 'approve') {
    const lastMessages = await getLastMessagesForRooms([room._id]);
    const lastMessage = lastMessages.get(room._id.toString()) || null;
    emitToUser(userId, 'room:membershipApproved', {
      roomId: room._id.toString(),
      roomName: room.name,
      room: formatRoom(room, userId, {
        lastMessage,
        lastActivity: lastMessage?.timestamp || room.updatedAt || room.createdAt
      })
    });
  } else {
    emitToUser(userId, 'room:membershipDenied', {
      roomId: room._id.toString(),
      roomName: room.name
    });
  }

  res.json({
    message: action === 'approve' ? 'Request approved' : 'Request denied',
    room: formatRoom(room, req.user.id)
  });
});

exports.inviteUser = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const room = await Room.findById(req.params.roomId);

  if (!room) {
    throw createError(404, 'Room not found');
  }

  if (room.owner.toString() !== req.user.id) {
    throw createError(403, 'You do not have permission to manage this room');
  }

  if (room.type !== 'private') {
    throw createError(400, 'Invitations are only available for private rooms');
  }

  if (!username) {
    throw createError(400, 'Username is required');
  }

  const targetUser = await User.findOne({ username });
  if (!targetUser) {
    throw createError(404, 'Target user not found');
  }

  const memberIds = room.members.map((memberId) => memberId.toString());
  if (!memberIds.includes(targetUser._id.toString())) {
    room.members.push(targetUser._id);
  }

  room.pendingRequests = room.pendingRequests.filter(
    (pendingId) => pendingId.toString() !== targetUser._id.toString()
  );

  await room.save();

  res.json({
    message: 'User invited successfully',
    room: formatRoom(await room.populate('owner', 'username'), req.user.id)
  });
});

exports.getMessages = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId).populate('owner', '_id');

  if (!room) {
    throw createError(404, 'Room not found');
  }

  const userId = req.user?.id;

  if (room.type !== 'public') {
    if (!userId) {
      throw createError(401, 'Authentication required');
    }

    const isMember =
      room.owner._id.toString() === userId ||
      room.members.some((memberId) => memberId.toString() === userId);

    if (!isMember) {
      throw createError(403, 'Access denied for this room');
    }
  }

  const messages = await Message.find({ room: room._id })
    .sort({ timestamp: -1 })
    .limit(50)
    .populate('sender', 'username')
    .lean();

  res.json({
    messages: messages.reverse().map((message) => ({
      id: message._id,
      text: message.text,
      username: message.sender?.username || 'Unknown user',
      timestamp: message.timestamp
    }))
  });
});

exports.getRoomByName = async (name) => Room.findOne({ name });
exports.getRoomById = async (id) => Room.findById(id);
