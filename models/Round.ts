// models/Round.ts
import mongoose from 'mongoose';

const RoundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'name required.'],
  },
  intro_text: {
    type: String,
  },
  intro_video: {
    type: String,
  },
  intro_length: {
    type: Number,
  },
  outro_text: {
    type: String,
  },
  outro_video: {
    type: String,
  },
  outro_length: {
    type: Number,
  },
  point_value: {
    type: Number,
    default: 100,
  },
  order:{
    type: Number,
    default: 0,
  },
  questions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Round || mongoose.model('Round', RoundSchema);