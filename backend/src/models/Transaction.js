import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true },
  gameSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameSession' },
  type: {
    type: String,
    enum: ['entry_fee', 'prize_payout', 'refund', 'platform_fee'],
    required: true
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USDT' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  escrowId: String,
  txHash: String,
  createdAt: { type: Date, default: Date.now }
});

transactionSchema.index({ walletAddress: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
