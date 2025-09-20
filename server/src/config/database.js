const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
