// models/Room.ts
import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Room code required.'],
    maxlength: [4, 'Code cannot be more than 4 characters'],
    unique: true,
  },
  status: {//waiting-not started, active-in progress & host connected, paused-in progress, host disconnected,finished-game over
    type: String,
    default: "waiting",
  },
  state_timer: {//counts down seconds remaining in current state
    type: Number,
    default: -1,
  },
  room_rounds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room_Round',
  }],
  current_round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room_Round',
      default: null,
  },
  current_question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room_Question',
      default: null,
  },
  active: {//true if a game has been started in this room
    type: Boolean,
    default: false,
  },
  expiry_time: {
    type: Date,
    required: [true, 'Please provide an expiry date.'],
  },
  players: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);