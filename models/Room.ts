// models/Room.ts
import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Room code required.'],
    maxlength: [4, 'Code cannot be more than 4 characters'],
    unique: true,
  },
  status: {
    type: String,
    default: "waiting",
  },
  expiry_time: {
    type: Date,
    required: [true, 'Please provide an expiry date.'],
  },
}, {
  timestamps: true,
});

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);