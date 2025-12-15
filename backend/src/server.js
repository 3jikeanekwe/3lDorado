import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import GameSession from './models/GameSession.js';
import User from './models/User.js';
import matchmakingService from './services/matchmaking.js';
import gameEngine from './services/gameEngine.js';
import paymentService from './services/payment.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Connect to database
await connectDatabase();

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/lobbies/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    const lobbies = await matchmakingService.getAvailableLobbies(gameType);
    res.json(lobbies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/:walletAddress', async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.params.walletAddress });
    res.json(user || { walletAddress: req.params.walletAddress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket Connection
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Join game lobby
  socket.on('join_lobby', async (data) => {
    try {
      const { gameType, tier, walletAddress, username } = data;

      // Find or create session
      const session = await matchmakingService.findOrCreateSession(
        gameType,
        tier,
        walletAddress
      );

      // Process payment (if not free tier)
      if (tier > 0) {
        const payment = await paymentService.createGameEscrow(
          session._id,
          walletAddress,
          tier
        );
        console.log('💰 Payment processed:', payment);
      }

      // Add player to session
      await matchmakingService.addPlayer(session._id, {
        walletAddress,
        username
      });

      const updatedSession = await GameSession.findById(session._id);

      // Join socket room
      socket.join(session._id.toString());
      socket.data.sessionId = session._id.toString();
      socket.data.walletAddress = walletAddress;

      // Notify player
      socket.emit('lobby_joined', {
        sessionId: session._id,
        players: updatedSession.players,
        currentPlayers: updatedSession.players.length,
        maxPlayers: updatedSession.maxPlayers
      });

      // Notify all players in lobby
      io.to(session._id.toString()).emit('lobby_updated', {
        players: updatedSession.players,
        currentPlayers: updatedSession.players.length,
        maxPlayers: updatedSession.maxPlayers
      });

      // Start countdown if full
      if (updatedSession.players.length === updatedSession.maxPlayers) {
        io.to(session._id.toString()).emit('game_starting', {
          countdown: 60 // 1 minute
        });

        // Start game after countdown
        setTimeout(async () => {
          await startGame(session._id.toString());
        }, 60000);
      }

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Leave lobby
  socket.on('leave_lobby', async () => {
    try {
      const { sessionId, walletAddress } = socket.data;
      if (!sessionId) return;

      await matchmakingService.removePlayer(sessionId, walletAddress);
      socket.leave(sessionId);

      const session = await GameSession.findById(sessionId);
      if (session) {
        io.to(sessionId).emit('lobby_updated', {
          players: session.players,
          currentPlayers: session.players.length
        });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Game actions
  socket.on('game_action', async (data) => {
    try {
      const { sessionId, walletAddress } = socket.data;
      const session = await GameSession.findById(sessionId);
      
      if (!session || session.status !== 'active') return;

      let result;
      switch(session.gameType) {
        case 'typing':
          result = gameEngine.processTypingInput(sessionId, walletAddress, data.input);
          break;
        case 'runner':
          result = gameEngine.processRunnerMovement(sessionId, walletAddress, data.action);
          break;
        case 'shooter':
          result = gameEngine.processShooterAction(sessionId, walletAddress, data.action, data);
          break;
      }

      // Send result to player
      socket.emit('action_result', result);

      // Broadcast game state to all players
      const gameState = gameEngine.games.get(sessionId);
      io.to(sessionId).emit('game_state_update', gameState);

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log('🔌 Client disconnected:', socket.id);
    
    const { sessionId, walletAddress } = socket.data;
    if (sessionId && walletAddress) {
      await matchmakingService.removePlayer(sessionId, walletAddress);
    }
  });
});

// Start game function
async function startGame(sessionId) {
  try {
    const session = await GameSession.findById(sessionId);
    if (!session) return;

    // Update session status
    session.status = 'active';
    session.startTime = new Date();
    
    // Calculate prize pool
    const fees = paymentService.calculateFees(session.tier, session.players.length);
    session.prizePool = fees.prizePool;
    session.platformFee = fees.totalFees;
    
    await session.save();

    // Initialize game
    let gameState;
    switch(session.gameType) {
      case 'typing':
        gameState = gameEngine.initTypingGame(sessionId, session.players);
        break;
      case 'runner':
        gameState = gameEngine.initRunnerGame(sessionId, session.players);
        break;
      case 'shooter':
        gameState = gameEngine.initShooterGame(sessionId, session.players);
        break;
    }

    // Notify players
    io.to(sessionId).emit('game_started', {
      gameType: session.gameType,
      prizePool: session.prizePool,
      gameState
    });

    // Set game duration (5 minutes)
    setTimeout(async () => {
      await endGame(sessionId);
    }, 300000);

  } catch (error) {
    console.error('Game start error:', error);
  }
}


// End game function (continued)
async function endGame(sessionId) {
  try {
    const session = await GameSession.findById(sessionId);
    if (!session) return;

    // Calculate rankings
    const rankings = gameEngine.calculateRankings(sessionId);
    
    // Update session with winners (top 10)
    session.winners = rankings.slice(0, 10);
    session.status = 'completed';
    session.endTime = new Date();
    
    // Update player rankings
    session.players = session.players.map(player => {
      const ranking = rankings.find(r => r.walletAddress === player.walletAddress);
      return {
        ...player,
        rank: ranking ? ranking.rank : null,
        score: ranking ? ranking.score : 0
      };
    });
    
    await session.save();

    // Process payouts (if not free tier)
    if (session.tier > 0) {
      const payouts = await paymentService.releaseWinnerPayouts(session);
      console.log('💰 Payouts processed:', payouts);
    }

    // Update user statistics
    for (const player of session.players) {
      await User.findOneAndUpdate(
        { walletAddress: player.walletAddress },
        {
          $inc: { 
            totalGamesPlayed: 1,
            totalWinnings: player.rank <= 10 ? (session.prizePool * getPrizePercentage(player.rank)) : 0
          },
          $set: {
            winRate: player.rank <= 10 ? 1 : 0 // This should be calculated properly
          }
        },
        { upsert: true }
      );
    }

    // Notify all players
    io.to(sessionId).emit('game_ended', {
      rankings,
      winners: session.winners,
      prizePool: session.prizePool
    });

    // Clean up game state
    gameEngine.games.delete(sessionId);

  } catch (error) {
    console.error('Game end error:', error);
  }
}

function getPrizePercentage(rank) {
  const percentages = {
    1: 0.40,
    2: 0.25,
    3: 0.15,
    4: 0.20 / 7,
    5: 0.20 / 7,
    6: 0.20 / 7,
    7: 0.20 / 7,
    8: 0.20 / 7,
    9: 0.20 / 7,
    10: 0.20 / 7
  };
  return percentages[rank] || 0;
}

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
