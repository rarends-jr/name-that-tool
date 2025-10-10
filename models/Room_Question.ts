// models/Room_Question.ts
import mongoose from 'mongoose';

const Room_QuestionSchema = new mongoose.Schema({
  room_round: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room_Round',
    required: true,
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  order:{
    type: Number,
    default: 0,
  },
  responses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Response',
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Room_Question || mongoose.model('Room_Question', Room_QuestionSchema);