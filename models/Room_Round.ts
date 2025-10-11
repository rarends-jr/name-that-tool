// models/Room_Round.ts
import mongoose from 'mongoose';

const Room_RoundSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  round: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round',
    required: true,
  },
  room_questions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room_Question',
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Room_Round || mongoose.model('Room_Round', Room_RoundSchema);