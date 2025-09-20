require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const PORT = Number(process.env.PORT) || 3001;
const MONGO_URI = process.env.MONGO_URI;
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI environment variable. Please set it in your .env file.');
}

const app = express();
app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);
const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['public', 'private', 'request'],
    default: 'public'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  pendingRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
});

const Room = mongoose.model('Room', roomSchema);

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
    });
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Registration successful.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Failed to register user.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const existingUser = await User.findOne({ username });

    if (!existingUser) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, existingUser.password);

    if (!passwordMatches) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    res.json({ message: 'Login successful.', username: existingUser.username });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Failed to login user.' });
  }
});

const authenticateUser = async (username, password) => {
  if (!username || !password) {
    return null;
  }

  const user = await User.findOne({ username });
  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return null;
  }

  return user;
};

app.post('/api/rooms', async (req, res) => {
  try {
    const { name, description = '', type = 'public', username, password } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required.' });
    }

    const user = await authenticateUser(username, password);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!['public', 'private', 'request'].includes(type)) {
      return res.status(400).json({ message: 'Invalid room type provided.' });
    }

    const newRoom = new Room({
      name,
      description,
      type,
      owner: user._id,
      members: [user._id]
    });

    await newRoom.save();

    res.status(201).json({
      message: 'Room created successfully.',
      room: {
        id: newRoom._id,
        name: newRoom.name,
        description: newRoom.description,
        type: newRoom.type
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Room name already exists.' });
    }

    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Failed to create room.' });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.broadcast.emit('user event', 'A user has joined');

  socket.on('join room', async ({ roomName, username }) => {
    try {
      if (!roomName) {
        socket.emit('user event', 'Room name is required to join.');
        return;
      }

      const room = await Room.findOne({ name: roomName });

      if (!room) {
        socket.emit('user event', 'Room not found.');
        return;
      }

      if (!username) {
        socket.emit('user event', 'You must be logged in to join rooms.');
        return;
      }

      const user = await User.findOne({ username });

      if (!user) {
        socket.emit('user event', 'User account not found.');
        return;
      }

      if (!Array.isArray(room.members)) {
        room.members = [];
      }

      if (!Array.isArray(room.pendingRequests)) {
        room.pendingRequests = [];
      }

      const memberIds = room.members;
      const pendingIds = room.pendingRequests;

      const isMember = room.owner.equals(user._id) || memberIds.some((member) => member.equals(user._id));

      if (room.type === 'private' && !isMember) {
        socket.emit('user event', 'You do not have access to this private room.');
        return;
      }

      if (room.type === 'request' && !isMember) {
        const alreadyPending = pendingIds.some((pendingId) => pendingId.equals(user._id));

        if (!alreadyPending) {
          room.pendingRequests.push(user._id);
          await room.save();
        }

        socket.emit('user event', 'Your request to join has been sent for approval.');
        return;
      }

      if (!isMember) {
        room.members.push(user._id);
        await room.save();
      }

      socket.join(room.name);
      socket.emit('user event', `Joined room: ${room.name}`);
      socket.to(room.name).emit('user event', `${username || 'A user'} has joined ${room.name}.`);
    } catch (error) {
      console.error('Error handling join room:', error);
      socket.emit('user event', 'Failed to join room.');
    }
  });

  socket.on('chat message', async (message) => {
    try {
      console.log('Message received from', socket.id, message);

      const senderUsername = message?.username;
      const text = message?.text;
      const roomName = message?.roomName;

      if (!senderUsername || !text || !roomName) {
        return;
      }

      const sender = await User.findOne({ username: senderUsername });

      if (!sender) {
        console.warn('Sender not found for message', message);
        return;
      }

      const room = await Room.findOne({ name: roomName });

      if (!room) {
        console.warn('Room not found for message', message);
        return;
      }

      const memberIds = Array.isArray(room.members) ? room.members : [];
      const isMember = room.owner.equals(sender._id) || memberIds.some((member) => member.equals(sender._id));

      if (room.type !== 'public' && !isMember) {
        console.warn('Unauthorized message attempt from', senderUsername, 'to room', roomName);
        return;
      }

      const savedMessage = await Message.create({
        text,
        sender: sender._id,
        room: room._id
      });

      const populatedMessage = await savedMessage
        .populate('sender', 'username')
        .populate('room', 'name');

      io.to(room.name).emit('chat message', {
        username: populatedMessage.sender.username,
        text: populatedMessage.text,
        roomName: populatedMessage.room.name,
        timestamp: populatedMessage.timestamp
      });
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    socket.broadcast.emit('user event', 'A user has left');
  });
});

app.get('/api/rooms/:id/requests', async (req, res) => {
  try {
    const { username, password } = req.query;
    const owner = await authenticateUser(username, password);

    if (!owner) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const room = await Room.findById(req.params.id).populate('pendingRequests', 'username');

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    if (room.owner.toString() !== owner._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to manage this room.' });
    }

    if (room.type !== 'request') {
      return res.status(400).json({ message: 'This room does not accept join requests.' });
    }

    const requests = (room.pendingRequests || []).map((pendingUser) => ({
      id: pendingUser._id,
      username: pendingUser.username
    }));

    res.json({
      room: {
        id: room._id,
        name: room.name,
        pendingCount: room.pendingRequests?.length || 0
      },
      requests
    });
  } catch (error) {
    console.error('Error fetching room requests:', error);
    res.status(500).json({ message: 'Failed to load room requests.' });
  }
});

app.post('/api/rooms/:id/approve', async (req, res) => {
  try {
    const { username, password, targetUserId, targetUsername, action } = req.body;

    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action.' });
    }

    const owner = await authenticateUser(username, password);

    if (!owner) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    if (room.owner.toString() !== owner._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to manage this room.' });
    }

    if (room.type !== 'request') {
      return res.status(400).json({ message: 'This room does not accept join requests.' });
    }

    let targetUser = null;

    if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
      targetUser = await User.findById(targetUserId);
    }

    if (!targetUser && targetUsername) {
      targetUser = await User.findOne({ username: targetUsername });
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    if (!Array.isArray(room.pendingRequests)) {
      room.pendingRequests = [];
    }

    const pendingIds = room.pendingRequests.map((pendingId) => pendingId.toString());

    if (!pendingIds.includes(targetUser._id.toString())) {
      return res.status(404).json({ message: 'No pending request found for this user.' });
    }

    room.pendingRequests = room.pendingRequests.filter(
      (pendingId) => pendingId.toString() !== targetUser._id.toString()
    );

    if (!Array.isArray(room.members)) {
      room.members = [];
    }

    if (action === 'approve') {
      const memberIds = room.members.map((memberId) => memberId.toString());
      if (!memberIds.includes(targetUser._id.toString())) {
        room.members.push(targetUser._id);
      }
    }

    await room.save();

    if (action === 'approve') {
      io.to(room.name).emit('user event', `${targetUser.username} has been granted access to ${room.name}.`);
    }

    const refreshedRoom = await Room.findById(room._id).populate('pendingRequests', 'username');

    const pendingRequests = refreshedRoom?.pendingRequests?.map((pendingUser) => ({
      id: pendingUser._id,
      username: pendingUser.username
    })) || [];

    res.json({
      message: action === 'approve' ? 'Request approved.' : 'Request denied.',
      room: {
        id: room._id,
        name: room.name,
        type: room.type,
        memberCount: room.members.length,
        pendingCount: room.pendingRequests.length
      },
      pendingRequests
    });
  } catch (error) {
    console.error('Error updating room request:', error);
    res.status(500).json({ message: 'Failed to update room request.' });
  }
});

app.post('/api/rooms/:id/invite', async (req, res) => {
  try {
    const { username, password, targetUsername } = req.body;

    if (!targetUsername) {
      return res.status(400).json({ message: 'Target username is required.' });
    }

    const owner = await authenticateUser(username, password);

    if (!owner) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    if (room.owner.toString() !== owner._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to manage this room.' });
    }

    if (room.type !== 'private') {
      return res.status(400).json({ message: 'Invites are only available for private rooms.' });
    }

    const targetUser = await User.findOne({ username: targetUsername });

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    if (targetUser._id.toString() === owner._id.toString()) {
      return res.status(400).json({ message: 'You are already the owner of this room.' });
    }

    if (!Array.isArray(room.members)) {
      room.members = [];
    }

    const memberIds = room.members.map((memberId) => memberId.toString());

    if (!memberIds.includes(targetUser._id.toString())) {
      room.members.push(targetUser._id);
    }

    if (Array.isArray(room.pendingRequests)) {
      room.pendingRequests = room.pendingRequests.filter(
        (pendingId) => pendingId.toString() !== targetUser._id.toString()
      );
    }

    await room.save();

    io.to(room.name).emit('user event', `${targetUser.username} has been invited to ${room.name}.`);

    res.json({
      message: 'User invited successfully.',
      room: {
        id: room._id,
        name: room.name,
        type: room.type,
        memberCount: room.members.length
      }
    });
  } catch (error) {
    console.error('Error inviting user to room:', error);
    res.status(500).json({ message: 'Failed to invite user.' });
  }
});

app.get('/', (req, res) => {
  res.send('Real-time chat server is up');
});

app.get('/api/messages', async (req, res) => {
  try {
    const { roomName, username: requesterUsername, password: requesterPassword } = req.query;

    if (!roomName) {
      return res.status(400).json({ message: 'Room name is required.' });
    }

    const room = await Room.findOne({ name: roomName });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    if (room.type !== 'public') {
      const requestingUser = await authenticateUser(requesterUsername, requesterPassword);

      if (!requestingUser) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const memberIds = Array.isArray(room.members) ? room.members : [];
      const isMember = room.owner.equals(requestingUser._id) || memberIds.some((member) => member.equals(requestingUser._id));

      if (!isMember) {
        return res.status(403).json({ message: 'Access denied for this room.' });
      }
    }

    const recentMessages = await Message.find({ room: room._id })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('sender', 'username')
      .populate('room', 'name');

    const normalizedMessages = recentMessages
      .reverse()
      .map((message) => ({
        username: message.sender?.username || 'Unknown user',
        text: message.text,
        timestamp: message.timestamp,
        roomName: message.room?.name || null
      }));

    res.json({ messages: normalizedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to load messages.' });
  }
});

app.get('/api/rooms/public', async (req, res) => {
  try {
    const { username, password } = req.query;
    const authenticatedUser = username && password ? await authenticateUser(username, password) : null;

    const publicRooms = await Room.find({ type: { $in: ['public', 'request'] } })
      .sort({ name: 1 })
      .populate('owner', 'username');

    let rooms = [...publicRooms];

    if (authenticatedUser) {
      const privateRooms = await Room.find({
        type: 'private',
        $or: [{ owner: authenticatedUser._id }, { members: authenticatedUser._id }]
      })
        .sort({ name: 1 })
        .populate('owner', 'username');

      rooms = rooms.concat(privateRooms);
    }

    const uniqueRoomsMap = new Map();
    rooms.forEach((room) => {
      uniqueRoomsMap.set(room._id.toString(), room);
    });

    const uniqueRooms = Array.from(uniqueRoomsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const formattedRooms = uniqueRooms.map((room) => {
      const memberIds = Array.isArray(room.members) ? room.members : [];
      const ownerId = room.owner?._id ? room.owner._id : room.owner;
      const authenticatedId = authenticatedUser ? authenticatedUser._id.toString() : null;
      const isOwner = authenticatedId ? ownerId?.toString() === authenticatedId : false;
      const isMember = authenticatedId
        ? isOwner || memberIds.some((member) => member?.toString() === authenticatedId)
        : false;

      return {
        id: room._id,
        name: room.name,
        description: room.description,
        type: room.type,
        owner: room.owner?.username || 'Unknown user',
        memberCount: memberIds.length || 0,
        pendingCount: room.pendingRequests?.length || 0,
        isOwner,
        isMember
      };
    });

    res.json({ rooms: formattedRooms });
  } catch (error) {
    console.error('Error fetching public rooms:', error);
    res.status(500).json({ message: 'Failed to load rooms.' });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
