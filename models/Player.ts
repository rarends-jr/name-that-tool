// models/Player.ts
import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
  },
  name: {
    type: String,
    required: [true, 'name required.'],
    minLength: [1, 'Your name must be at least 1 character'],
    maxlength: [255, 'What the hell use a a nickname'],
  },
  active: {//true if the player's screen polled in the last second
    type: Boolean,
    default: false,
  },
  responses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Response',
  }],
}, {
  timestamps: true,
});


PlayerSchema.index({ room: 1, name: 1 }, { unique: true });

export default mongoose.models.Player || mongoose.model('Player', PlayerSchema);