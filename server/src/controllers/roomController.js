const createError = require('http-errors');
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return normalizeId(value._id);
  return value.toString();
};

const formatRoom = (room, currentUserId) => {
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
    createdAt: room.createdAt
  };
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

  res.json({
    message: action === 'approve' ? 'Request approved' : 'Request denied',
    room: formatRoom(await room.populate('owner', 'username'), req.user.id)
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
