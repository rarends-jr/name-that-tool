// models/Question.ts
import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  round: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Round',
    required: true,
  },
  imageUrl: {
    type: String,
  },
  answer: {
    type: String,
  },
  type:{
    type: String,
    default: 'tool',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);