const createError = require('http-errors');
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const { emitToUser, emitToRoom } = require('../sockets/socketRegistry');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value.toHexString) return value.toHexString();
  if (value._id) return normalizeId(value._id);
  return value.toString();
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getMemberIds = (room) =>
  Array.isArray(room.members) ? room.members.map((member) => normalizeId(member)).filter(Boolean) : [];

const getModeratorIds = (room) =>
  Array.isArray(room.moderators)
    ? room.moderators.map((moderator) => normalizeId(moderator)).filter(Boolean)
    : [];

const getBannedIds = (room) =>
  Array.isArray(room.banned) ? room.banned.map((userId) => normalizeId(userId)).filter(Boolean) : [];

const getUserRole = (room, userId) => {
  if (!userId) return 'guest';
  const normalized = userId.toString();
  const ownerId = normalizeId(room.owner);
  if (ownerId === normalized) {
    return 'owner';
  }
  if (getModeratorIds(room).includes(normalized)) {
    return 'moderator';
  }
  if (getMemberIds(room).includes(normalized)) {
    return 'member';
  }
  return 'guest';
};

const canManageRoom = (room, userId) => {
  const role = getUserRole(room, userId);
  return role === 'owner' || role === 'moderator';
};

const ensureActorCanManageMembers = (room, actorId) => {
  if (!canManageRoom(room, actorId)) {
    throw createError(403, 'You do not have permission to manage this room');
  }
};

const buildMembersPayload = async (room) => {
  const ownerId = normalizeId(room.owner);
  const memberIds = getMemberIds(room);
  const moderatorIds = getModeratorIds(room);
  const uniqueMemberIds = Array.from(new Set([ownerId, ...memberIds]));

  const users = await User.find({ _id: { $in: uniqueMemberIds } })
    .select('_id username')
    .lean();
  const userMap = new Map();
  users.forEach((user) => {
    userMap.set(user._id.toString(), user.username);
  });

  const members = uniqueMemberIds.map((id) => ({
    id,
    username: userMap.get(id) || 'Unknown user',
    role: id === ownerId ? 'owner' : moderatorIds.includes(id) ? 'moderator' : 'member'
  }));

  const bannedIds = getBannedIds(room);
  const bannedUsers = bannedIds.length
    ? await User.find({ _id: { $in: bannedIds } }).select('_id username').lean()
    : [];

  const banned = bannedUsers.map((user) => ({ id: user._id.toString(), username: user.username }));

  return { members, banned };
};

const formatRoom = (room, currentUserId, extras = {}) => {
  const ownerId = normalizeId(room.owner);
  const userId = currentUserId ? currentUserId.toString() : null;
  const memberIds = getMemberIds(room);
  const moderatorIds = getModeratorIds(room);
  const bannedIds = getBannedIds(room);
  const isOwner = userId ? ownerId === userId : false;
  const isModerator = userId ? moderatorIds.includes(userId) : false;
  const isMember = userId ? isOwner || isModerator || memberIds.includes(userId) : false;

  const payload = {
    id: room._id,
    name: room.name,
    description: room.description,
    type: room.type,
    owner: room.owner?.username || normalizeId(room.owner),
    memberCount: memberIds.length,
    pendingCount: room.pendingRequests?.length || 0,
    isOwner,
    isMember,
    isModerator,
    moderatorCount: moderatorIds.length,
    bannedCount: bannedIds.length,
    hasPendingRequest: extras.hasPendingRequest ?? false,
    lastMessage: extras.lastMessage || null,
    lastActivity: extras.lastActivity || room.updatedAt || room.createdAt,
    createdAt: room.createdAt
  };

  if (typeof extras.moderators !== 'undefined') {
    payload.moderators = extras.moderators;
  }

  if (typeof extras.banned !== 'undefined') {
    payload.banned = extras.banned;
  }

  return payload;
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
    .populate('members', '_id')
    .populate('moderators', '_id username');

  let rooms = [...publicRooms];

  if (currentUserId) {
    const memberRooms = await Room.find({
      type: 'private',
      $or: [{ owner: currentUserId }, { members: currentUserId }]
    })
      .sort({ name: 1 })
      .populate('owner', 'username')
      .populate('members', '_id')
      .populate('moderators', '_id username');

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
    .populate('pendingRequests', 'username')
    .populate('moderators', '_id username');

  if (!room) {
    throw createError(404, 'Room not found');
  }

  if (!canManageRoom(room, req.user.id)) {
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
  const room = await Room.findById(req.params.roomId).populate('moderators', '_id');

  if (!room) {
    throw createError(404, 'Room not found');
  }

  if (!canManageRoom(room, req.user.id)) {
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

  if (!canManageRoom(room, req.user.id)) {
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

exports.getMembers = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId);

  if (!room) {
    throw createError(404, 'Room not found');
  }

  const currentUserId = req.user?.id;
  const currentRole = getUserRole(room, currentUserId);

  if (currentRole === 'guest') {
    throw createError(403, 'You must be a member of this room');
  }

  const membership = await buildMembersPayload(room);

  res.json({
    ...membership,
    permissions: {
      canManage: canManageRoom(room, currentUserId),
      canPromote: currentRole === 'owner',
      currentRole
    }
  });
});

exports.updateMember = asyncHandler(async (req, res) => {
  const { action, userId: targetUserId } = req.body;
  const actorId = req.user.id;

  if (!action || !targetUserId) {
    throw createError(400, 'Action and userId are required');
  }

  const room = await Room.findById(req.params.roomId);

  if (!room) {
    throw createError(404, 'Room not found');
  }

  ensureActorCanManageMembers(room, actorId);

  const actorRole = getUserRole(room, actorId);
  const targetId = normalizeId(targetUserId);
  const ownerId = normalizeId(room.owner);
  const memberIds = getMemberIds(room);
  const moderatorIds = getModeratorIds(room);
  const bannedIds = getBannedIds(room);

  if (targetId === ownerId) {
    throw createError(400, 'You cannot modify the room owner');
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw createError(404, 'Target user not found');
  }

  let message;

  const removeFromMembers = () => {
    room.members = room.members.filter((member) => normalizeId(member) !== targetId);
    room.moderators = room.moderators.filter((moderator) => normalizeId(moderator) !== targetId);
    room.pendingRequests = room.pendingRequests.filter((pending) => normalizeId(pending) !== targetId);
  };

  switch (action) {
    case 'promote': {
      if (actorRole !== 'owner') {
        throw createError(403, 'Only the owner can promote members');
      }

      if (moderatorIds.includes(targetId)) {
        throw createError(400, 'User is already a moderator');
      }

      if (!memberIds.includes(targetId)) {
        throw createError(400, 'User must be a member before being promoted');
      }

      room.moderators.push(targetUser._id);
      message = `${targetUser.username} is now a moderator.`;
      break;
    }
    case 'demote': {
      if (actorRole !== 'owner') {
        throw createError(403, 'Only the owner can demote moderators');
      }

      if (!moderatorIds.includes(targetId)) {
        throw createError(400, 'User is not a moderator');
      }

      room.moderators = room.moderators.filter((moderator) => normalizeId(moderator) !== targetId);
      message = `${targetUser.username} is no longer a moderator.`;
      break;
    }
    case 'remove': {
      const targetRole = getUserRole(room, targetId);
      if (targetRole === 'guest') {
        throw createError(400, 'User is not a member of this room');
      }
      if (targetRole === 'moderator' && actorRole !== 'owner') {
        throw createError(403, 'Only the owner can remove a moderator');
      }

      removeFromMembers();
      message = `${targetUser.username} has been removed from the room.`;
      break;
    }
    case 'ban': {
      const targetRole = getUserRole(room, targetId);
      if (targetRole === 'moderator' && actorRole !== 'owner') {
        throw createError(403, 'Only the owner can ban a moderator');
      }

      if (bannedIds.includes(targetId)) {
        throw createError(400, 'User is already banned');
      }

      removeFromMembers();
      room.banned.push(targetUser._id);
      message = `${targetUser.username} has been banned.`;
      break;
    }
    case 'unban': {
      if (!bannedIds.includes(targetId)) {
        throw createError(400, 'User is not banned');
      }

      room.banned = room.banned.filter((bannedUser) => normalizeId(bannedUser) !== targetId);
      message = `${targetUser.username} has been unbanned.`;
      break;
    }
    default:
      throw createError(400, 'Unsupported action');
  }

  await room.save();

  const actorRoleAfter = getUserRole(room, actorId);
  const targetRoleAfter = getUserRole(room, targetId);

  const membership = await buildMembersPayload(room);

  res.json({
    message,
    members: membership.members,
    banned: membership.banned,
    permissions: {
      canManage: canManageRoom(room, actorId),
      canPromote: actorRoleAfter === 'owner',
      currentRole: actorRoleAfter
    }
  });

  emitToRoom(room._id, 'room:memberAction', {
    roomId: room._id.toString(),
    action,
    user: { id: targetId, username: targetUser.username },
    actor: { id: actorId, username: req.user.username },
    memberCount: room.members.length,
    moderatorCount: room.moderators.length,
    bannedCount: room.banned.length,
    role: targetRoleAfter
  });

  emitToUser(targetId, 'room:membershipUpdate', {
    roomId: room._id.toString(),
    roomName: room.name,
    action,
    role: targetRoleAfter,
    banned: getBannedIds(room).includes(targetId)
  });
});

exports.getMessages = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId).populate('owner', '_id');

  if (!room) {
    throw createError(404, 'Room not found');
  }

  const userId = req.user?.id;

  if (userId && getBannedIds(room).includes(userId.toString())) {
    throw createError(403, 'You are banned from this room');
  }

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
