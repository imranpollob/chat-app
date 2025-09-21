const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  listRooms,
  createRoom,
  getPendingRequests,
  handleJoinRequest,
  inviteUser,
  getMessages,
  getJoinedRooms,
  discoverRooms,
  getMembers,
  updateMember,
  leaveRoom
} = require('../controllers/roomController');

const router = express.Router();

router.get('/', authMiddleware(false), listRooms);
router.get('/joined', authMiddleware(), getJoinedRooms);
router.get('/discover', authMiddleware(false), discoverRooms);
router.post('/', authMiddleware(), createRoom);
router.get('/:roomId/messages', authMiddleware(false), getMessages);
router.get('/:roomId/members', authMiddleware(), getMembers);
router.post('/:roomId/members', authMiddleware(), updateMember);
router.get('/:roomId/requests', authMiddleware(), getPendingRequests);
router.post('/:roomId/requests', authMiddleware(), handleJoinRequest);
router.post('/:roomId/invite', authMiddleware(), inviteUser);
router.post('/:roomId/leave', authMiddleware(), leaveRoom);

module.exports = router;
