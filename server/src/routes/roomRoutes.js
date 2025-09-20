const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  listRooms,
  createRoom,
  getPendingRequests,
  handleJoinRequest,
  inviteUser,
  getMessages
} = require('../controllers/roomController');

const router = express.Router();

router.get('/', authMiddleware(false), listRooms);
router.post('/', authMiddleware(), createRoom);
router.get('/:roomId/messages', authMiddleware(false), getMessages);
router.get('/:roomId/requests', authMiddleware(), getPendingRequests);
router.post('/:roomId/requests', authMiddleware(), handleJoinRequest);
router.post('/:roomId/invite', authMiddleware(), inviteUser);

module.exports = router;
