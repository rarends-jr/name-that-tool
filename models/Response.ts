// models/Response.ts
import mongoose from 'mongoose';

const ResponseSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  response: {
    type: String,
    required: [true, 'response required.'],
    maxlength: [255, 'response cannot be more than 255 characters.'],
  },
  match_score: {
    type: Number,
    default: 0//scale is 1-10. 0 indicates that AI hasn't scored yet, -1 indicates not specific enough.
  },
}, {
  timestamps: true,
});
ResponseSchema.index({ player: 1, question: 1 }, { unique: true });

export default mongoose.models.Response || mongoose.model('Response', ResponseSchema);