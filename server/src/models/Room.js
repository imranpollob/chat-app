const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 64
    },
    description: {
      type: String,
      trim: true,
      maxlength: 256
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
    members: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      default: []
    },
    pendingRequests: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      default: []
    },
    moderators: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      default: []
    },
    banned: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

roomSchema.index({ owner: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ moderators: 1 });
roomSchema.index({ banned: 1 });

module.exports = mongoose.model('Room', roomSchema);
