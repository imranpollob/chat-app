const express = require('express');
const authRoutes = require('./authRoutes');
const roomRoutes = require('./roomRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);

module.exports = router;
