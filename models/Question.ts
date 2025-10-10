// models/Question.ts
import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  round: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round',
  },
  imageUrl: {
    type: String,
  },
  answer: {
    type: String,
  },
  order:{
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);