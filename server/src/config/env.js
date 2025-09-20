const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: process.env.ENV_PATH || path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173'
};

if (!env.mongoUri) {
  throw new Error('MONGO_URI is not defined in environment variables');
}

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

module.exports = env;
