import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import sessionManager from './services/sessionManager.js';
import gameEngine from './services/gameEngine.js';

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

// ============= REST API ROUTES =============

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    activeSessions: sessionManager.sessions.size,
    activeGames: gameEngine.games.size
  });
});

app.get('/api/lobbies/:gameType', (req, res) => {
  try {
    const { gameType } = req.params;
    const lobbies = sessionManager.getWaitingLobbies(gameType);
    res.json(lobbies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  const stats = {
    totalSessions: sessionManager.sessions.size,
    activeGames: gameEngine.games.size,
    connectedPlayers: io.sockets.sockets.size
  };
  res.json(stats);
});

// ============= WEBSOCKET HANDLERS =============

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // JOIN LOBBY
  socket.on('join_lobby', async (data) => {
    try {
      const { gameType, tier, walletAddress, username } = data;

      // Find or create session
      let session = sessionManager.findWaitingSession(gameType, tier, walletAddress);
      
      if (!session) {
        session = sessionManager.createSession(gameType, tier);
      }

      // Add player
      sessionManager.addPlayer(session.id, { walletAddress, username });
      const updatedSession = sessionManager.getSession(session.id);

      // Join socket room
      socket.join(session.id);
      socket.data.sessionId = session.id;
      socket.data.walletAddress = walletAddress;
      socket.data.username = username;

      console.log(`👤 ${username} joined session ${session.id} (${updatedSession.players.length}/${updatedSession.maxPlayers})`);

      // Notify player
      socket.emit('lobby_joined', {
        sessionId: session.id,
        players: updatedSession.players,
        currentPlayers: updatedSession.players.length,
        maxPlayers: updatedSession.maxPlayers,
        tier: updatedSession.tier
      });

      // Notify all players in lobby
      io.to(session.id).emit('lobby_updated', {
        players: updatedSession.players,
        currentPlayers: updatedSession.players.length,
        maxPlayers: updatedSession.maxPlayers
      });

      // Start countdown if full
      if (updatedSession.players.length === updatedSession.maxPlayers) {
        console.log(`🎮 Session ${session.id} is full! Starting countdown...`);
        
        io.to(session.id).emit('game_starting', {
          countdown: 60 // 60 seconds
        });

        // Start game after countdown
        setTimeout(() => {
          startGame(session.id);
        }, 60000); // 60 seconds
      }

    } catch (error) {
      console.error('Join lobby error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // LEAVE LOBBY
  socket.on('leave_lobby', () => {
    try {
      const { sessionId, walletAddress } = socket.data;
      if (!sessionId) return;

      console.log(`👋 ${socket.data.username} left session ${sessionId}`);

      sessionManager.removePlayer(sessionId, walletAddress);
      socket.leave(sessionId);

      const session = sessionManager.getSession(sessionId);
      if (session) {
        io.to(sessionId).emit('lobby_updated', {
          players: session.players,
          currentPlayers: session.players.length
        });
      }
    } catch (error) {
      console.error('Leave lobby error:', error);
    }
  });

  // GAME ACTION
  socket.on('game_action', (data) => {
    try {
      const { sessionId, walletAddress } = socket.data;
      const session = sessionManager.getSession(sessionId);
      
      if (!session || session.status !== 'active') return;

      let result;

      switch(session.gameType) {
        case 'typing':
          result = gameEngine.processTypingInput(sessionId, walletAddress, data.input);
          break;
        
        case 'runner':
          result = gameEngine.processRunnerAction(sessionId, walletAddress, data.action);
          break;
        
        case 'shooter':
          result = gameEngine.processShooterAction(sessionId, walletAddress, data.targetX, data.targetY);
          break;
        
        case 'memory':
          result = gameEngine.processMemoryFlip(sessionId, walletAddress, data.cardId);
          break;
        
        case 'math':
          result = gameEngine.processMathAnswer(sessionId, walletAddress, data.answer);
          break;
        
        case 'reaction':
          result = gameEngine.processReactionClick(sessionId, walletAddress, data.x, data.y);
          break;
        
        case 'snake':
          result = gameEngine.processSnakeMove(sessionId, walletAddress, data.direction);
          break;
        
        case 'trivia':
          result = gameEngine.processTriviaAnswer(sessionId, walletAddress, data.answerIndex);
          // Check if all players answered
          const gameState = gameEngine.games.get(sessionId);
          if (gameState.players.every(p => p.answered)) {
            setTimeout(() => {
              const hasMore = gameEngine.nextTriviaQuestion(sessionId);
              if (!hasMore) {
                endGame(sessionId);
              } else {
                io.to(sessionId).emit('next_question', gameEngine.games.get(sessionId));
              }
            }, 2000);
          }
          break;
      }

      // Send result to player
      if (result) {
        socket.emit('action_result', result);
      }

      // Broadcast updated game state
      const gameState = gameEngine.games.get(sessionId);
      if (gameState) {
        io.to(sessionId).emit('game_state_update', gameState);
      }

    } catch (error) {
      console.error('Game action error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    
    const { sessionId, walletAddress, username } = socket.data;
    if (sessionId && walletAddress) {
      console.log(`👋 ${username} disconnected from session ${sessionId}`);
      sessionManager.removePlayer(sessionId, walletAddress);
      
      const session = sessionManager.getSession(sessionId);
      if (session) {
        io.to(sessionId).emit('lobby_updated', {
          players: session.players,
          currentPlayers: session.players.length
        });
      }
    }
  });
});

// ============= GAME LIFECYCLE FUNCTIONS =============

function startGame(sessionId) {
  try {
    const session = sessionManager.getSession(sessionId);
    if (!session) return;

    console.log(`🎮 Starting game: ${session.gameType} (Session: ${sessionId})`);

    // Update session status
    sessionManager.updateSessionStatus(sessionId, 'active');

    // Initialize game based on type
    let gameState;
    switch(session.gameType) {
      case 'typing':
        gameState = gameEngine.initTypingGame(sessionId, session.players);
        break;
      case 'runner':
        gameState = gameEngine.initRunnerGame(sessionId, session.players);
        // Auto-move players every 100ms
        const runnerInterval = setInterval(() => {
          const gs = gameEngine.games.get(sessionId);
          if (!gs) {
            clearInterval(runnerInterval);
            return;
          }
          gs.players.forEach(p => {
            if (!p.isEliminated) {
              gameEngine.processRunnerAction(sessionId, p.walletAddress, 'run');
            }
          });
          io.to(sessionId).emit('game_state_update', gs);
        }, 100);
        break;
      case 'shooter':
        gameState = gameEngine.initShooterGame(sessionId, session.players);
        break;
      case 'memory':
        gameState = gameEngine.initMemoryGame(sessionId, session.players);
        break;
      case 'math':
        gameState = gameEngine.initMathGame(sessionId, session.players);
        break;
      case 'reaction':
        gameState = gameEngine.initReactionGame(sessionId, session.players);
        break;
      case 'snake':
        gameState = gameEngine.initSnakeGame(sessionId, session.players);
        // Auto-move snakes every 200ms
        const snakeInterval = setInterval(() => {
          const gs = gameEngine.games.get(sessionId);
          if (!gs) {
            clearInterval(snakeInterval);
            return;
          }
          gs.players.forEach(p => {
            if (!p.isEliminated) {
              gameEngine.processSnakeMove(sessionId, p.walletAddress, p.direction);
            }
          });
          io.to(sessionId).emit('game_state_update', gs);
        }, 200);
        break;
      case 'trivia':
        gameState = gameEngine.initTriviaGame(sessionId, session.players);
        break;
    }

    // Notify players
    io.to(sessionId).emit('game_started', {
      gameType: session.gameType,
      tier: session.tier,
      gameState
    });

    // Set game duration (5 minutes for most games)
    const duration = session.gameType === 'trivia' ? 300000 : 300000; // 5 minutes
    setTimeout(() => {
      endGame(sessionId);
    }, duration);

  } catch (error) {
    console.error('Start game error:', error);
  }
}

function endGame(sessionId) {
  try {
    const session = sessionManager.getSession(sessionId);
    if (!session) return;

    console.log(`🏁 Ending game: ${session.gameType} (Session: ${sessionId})`);

    // Calculate rankings
    const rankings = gameEngine.calculateRankings(sessionId);
    
    // Update session
    session.winners = rankings.slice(0, 10);
    sessionManager.updateSessionStatus(sessionId, 'completed');

    // Update players with final scores from game engine
    const gameState = gameEngine.games.get(sessionId);
    if (gameState) {
      session.players = gameState.players.map(gp => {
        const sp = session.players.find(p => p.walletAddress === gp.walletAddress);
        return {
          ...sp,
          score: gp.score,
          rank: rankings.find(r => r.walletAddress === gp.walletAddress)?.rank
        };
      });
    }

    console.log(`🏆 Winners:`, rankings.slice(0, 3).map(r => `${r.username} (${r.score})`));

    // Notify all players
    io.to(sessionId).emit('game_ended', {
      rankings,
      winners: session.winners,
      tier: session.tier,
      totalPlayers: session.players.length
    });

    // Clean up game state
    gameEngine.games.delete(sessionId);

    // Schedule session cleanup after 10 minutes
    setTimeout(() => {
      sessionManager.sessions.delete(sessionId);
      console.log(`🧹 Cleaned up session: ${sessionId}`);
    }, 600000); // 10 minutes

  } catch (error) {
    console.error('End game error:', error);
  }
}

// ============= CLEANUP & START SERVER =============

// Cleanup old sessions every hour
setInterval(() => {
  sessionManager.cleanupOldSessions();
}, 3600000);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`📦 No database - all in memory!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
