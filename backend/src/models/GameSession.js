import mongoose from 'mongoose';

const gameSessionSchema = new mongoose.Schema({
  gameType: {
    type: String,
    enum: ['typing', 'runner', 'shooter'],
    required: true
  },
  tier: {
    type: Number,
    enum: [0, 0.5, 1, 2, 5, 10, 25, 50, 100], // 0 = free
    required: true
  },
  players: [{
    walletAddress: String,
    username: String,
    score: { type: Number, default: 0 },
    rank: Number,
    isEliminated: { type: Boolean, default: false },
    joinedAt: Date
  }],
  maxPlayers: { type: Number, default: 64 },
  status: {
    type: String,
    enum: ['waiting', 'countdown', 'active', 'completed', 'cancelled'],
    default: 'waiting'
  },
  startTime: Date,
  endTime: Date,
  prizePool: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  winners: [{
    walletAddress: String,
    rank: Number,
    prize: Number
  }],
  escrowTransactionId: String,
  createdAt: { type: Date, default: Date.now }
});

gameSessionSchema.index({ status: 1, tier: 1, gameType: 1 });

export default mongoose.model('GameSession', gameSessionSchema);
