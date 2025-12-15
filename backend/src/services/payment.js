import fetch from 'node-fetch';
import Transaction from '../models/Transaction.js';

class PaymentService {
  constructor() {
    this.walletApiUrl = process.env.WALLET_API_URL;
  }

  // Calculate fees
  calculateFees(entryFee, playerCount) {
    const totalPool = entryFee * playerCount;
    const poolFee = totalPool * 0.05; // 5% of pool
    const individualFees = playerCount * (entryFee * 0.005); // 0.5% per stake
    const totalFees = poolFee + individualFees;
    const prizePool = totalPool - totalFees;

    return {
      totalPool,
      poolFee,
      individualFees,
      totalFees,
      prizePool
    };
  }

  // Prize distribution (Model B)
  calculatePrizeDistribution(prizePool) {
    return {
      1: prizePool * 0.40,  // 40%
      2: prizePool * 0.25,  // 25%
      3: prizePool * 0.15,  // 15%
      // 4-10 share remaining 20%
      4: prizePool * 0.20 / 7,
      5: prizePool * 0.20 / 7,
      6: prizePool * 0.20 / 7,
      7: prizePool * 0.20 / 7,
      8: prizePool * 0.20 / 7,
      9: prizePool * 0.20 / 7,
      10: prizePool * 0.20 / 7
    };
  }

  // Create escrow for game entry
  async createGameEscrow(gameSessionId, walletAddress, amount) {
    try {
      // Call your wallet API to create escrow
      const response = await fetch(`${this.walletApiUrl}/escrow/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: walletAddress,
          amount,
          purpose: `Game Entry - Session ${gameSessionId}`,
          releaseConditions: 'game_completion'
        })
      });

      const escrow = await response.json();

      // Record transaction
      const transaction = await Transaction.create({
        walletAddress,
        gameSessionId,
        type: 'entry_fee',
        amount,
        escrowId: escrow.id,
        status: 'pending'
      });

      return { escrow, transaction };
    } catch (error) {
      console.error('Escrow creation error:', error);
      throw error;
    }
  }

  // Release prizes to winners
  async releaseWinnerPayouts(gameSession) {
    const prizes = this.calculatePrizeDistribution(gameSession.prizePool);
    const payouts = [];

    try {
      for (const winner of gameSession.winners) {
        const amount = prizes[winner.rank];
        
        // Call wallet API to release from escrow
        const response = await fetch(`${this.walletApiUrl}/escrow/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escrowId: gameSession.escrowTransactionId,
            to: winner.walletAddress,
            amount
          })
        });

        const result = await response.json();

        // Record payout transaction
        const transaction = await Transaction.create({
          walletAddress: winner.walletAddress,
          gameSessionId: gameSession._id,
          type: 'prize_payout',
          amount,
          status: 'completed',
          txHash: result.txHash
        });

        payouts.push({ winner, amount, transaction });
      }

      return payouts;
    } catch (error) {
      console.error('Payout error:', error);
      throw error;
    }
  }

  // Refund if game cancelled
  async refundPlayers(gameSession) {
    const refunds = [];

    try {
      for (const player of gameSession.players) {
        const response = await fetch(`${this.walletApiUrl}/escrow/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escrowId: gameSession.escrowTransactionId,
            to: player.walletAddress,
            amount: gameSession.tier
          })
        });

        const result = await response.json();

        await Transaction.create({
          walletAddress: player.walletAddress,
          gameSessionId: gameSession._id,
          type: 'refund',
          amount: gameSession.tier,
          status: 'completed',
          txHash: result.txHash
        });

        refunds.push({ player, result });
      }

      return refunds;
    } catch (error) {
      console.error('Refund error:', error);
      throw error;
    }
  }
}

export default new PaymentService();
