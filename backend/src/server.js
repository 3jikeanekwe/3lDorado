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

// End game function
async function endGame(sessionId) {
  try {
    const session = await GameSession.findById(sessionId);
    if (!session) return;

    // Calculate rankings
    const rankings = gameEngine.calculateR
