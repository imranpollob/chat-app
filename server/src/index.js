const http = require('http');
const { Server } = require('socket.io');
const env = require('./config/env');
const connectDatabase = require('./config/database');
const app = require('./app');
const registerSocket = require('./sockets/socketManager');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.clientOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

registerSocket(io);

const startServer = async () => {
  await connectDatabase();

  server.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
