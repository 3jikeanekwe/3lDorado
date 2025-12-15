// File: backend/src/server.js - TOURNAMENT VERSION

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import tournamentManager from './services/tournamentManager.js';
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

// ============= REST API =============

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    activeTournaments: tournamentManager.tournaments.size,
    activeGames: gameEngine.games.size
  });
});

app.get('/api/tournaments/:gameType', (req, res) => {
  try {
    const { gameType } = req.params;
    const tournaments = [];
    
    for (const [id, tournament] of tournamentManager.tournaments) {
      if (tournament.gameType === gameType && tournament.status === 'waiting') {
        tournaments.push({
          id,
          tier: tournament.tier,
          currentPlayers: tournament.players.length,
          maxPlayers: tournament.maxPlayers,
          status: tournament.status
        });
      }
    }
    
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= WEBSOCKET HANDLERS =============

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  // JOIN TOURNAMENT
  socket.on('join_tournament', async (data) => {
    try {
      const { gameType, tier, walletAddress, username } = data;

      // Find or create tournament
      let tournament = tournamentManager.findWaitingTournament(gameType, tier, walletAddress);
      
      if (!tournament) {
        tournament = tournamentManager.createTournament(gameType, tier);
      }

      // Add player
      tournamentManager.addPlayer(tournament.id, { walletAddress, username });
      const updated = tournamentManager.getTournament(tournament.id);

      // Join socket room
      socket.join(tournament.id);
      socket.data.tournamentId = tournament.id;
      socket.data.walletAddress = walletAddress;
      socket.data.username = username;

      console.log(`👤 ${username} joined tournament ${tournament.id} (${updated.players.length}/64)`);

      // Notify player
      socket.emit('tournament_joined', {
        tournamentId: tournament.id,
        players: updated.players,
        currentPlayers: updated.players.length,
        maxPlayers: updated.maxPlayers,
        tier: updated.tier,
        totalPot: updated.totalPot,
        netPot: updated.netPot
      });

      // Notify all players
      io.to(tournament.id).emit('tournament_updated', {
        players: updated.players,
        currentPlayers: updated.players.length,
        maxPlayers: updated.maxPlayers,
        totalPot: updated.totalPot,
        netPot: updated.netPot
      });

      // Start countdown if full (64 players)
      if (updated.players.length === updated.maxPlayers) {
        console.log(`🏆 Tournament ${tournament.id} FULL! Starting countdown...`);
        
        io.to(tournament.id).emit('tournament_starting', {
          countdown: 60,
          totalPot: updated.totalPot,
          netPot: updated.netPot,
          prizes: tournamentManager.calculatePrizeDistribution(updated.netPot)
        });

        // Start Round 1 after countdown
        setTimeout(() => {
          startRound(tournament.id, 1);
        }, 60000);
      }

    } catch (error) {
      console.error('Join tournament error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // LEAVE TOURNAMENT
  socket.on('leave_tournament', () => {
    try {
      const { tournamentId, walletAddress } = socket.data;
      if (!tournamentId) return;

      // Can only leave if tournament hasn't started
      const tournament = tournamentManager.getTournament(tournamentId);
      if (tournament && tournament.status === 'waiting') {
        tournament.players = tournament.players.filter(p => p.walletAddress !== walletAddress);
        socket.leave(tournamentId);

        io.to(tournamentId).emit('tournament_updated', {
          players: tournament.players,
          currentPlayers: tournament.players.length
        });
      }
    } catch (error) {
      console.error('Leave tournament error:', error);
    }
  });

  // GAME ACTION
  socket.on('game_action', (data) => {
    try {
      const { tournamentId, walletAddress } = socket.data;
      const tournament = tournamentManager.getTournament(tournamentId);
      
      if (!tournament || !tournament.status.startsWith('round')) return;

      // Process game action based on game type
      let result;
      const sessionId = tournamentId; // Use tournament ID as session ID

      switch(tournament.gameType) {
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
          break;
      }

      if (result) {
        socket.emit('action_result', result);
      }

      // Broadcast game state
      const gameState = gameEngine.games.get(sessionId);
      if (gameState) {
        io.to(tournamentId).emit('game_state_update', gameState);
      }

    } catch (error) {
      console.error('Game action error:', error);
    }
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    console.log('🔌 Disconnected:', socket.id);
  });
});

// ============= TOURNAMENT LIFECYCLE =============

function startRound(tournamentId, roundNumber) {
  try {
    const tournament = tournamentManager.getTournament(tournamentId);
    if (!tournament) return;

    const round = tournamentManager.startRound(tournamentId, roundNumber);
    const activePlayers = tournamentManager.getActivePlayers(tournamentId);

    console.log(`🎮 Round ${roundNumber}: "${round.name}" starting with ${activePlayers.length} players`);

    // Initialize game for this round
    let gameState;
    switch(tournament.gameType) {
      case 'typing':
        gameState = gameEngine.initTypingGame(tournamentId, activePlayers);
        break;
      case 'runner':
        gameState = gameEngine.initRunnerGame(tournamentId, activePlayers);
        break;
      case 'shooter':
        gameState = gameEngine.initShooterGame(tournamentId, activePlayers);
        break;
      case 'memory':
        gameState = gameEngine.initMemoryGame(tournamentId, activePlayers);
        break;
      case 'math':
        gameState = gameEngine.initMathGame(tournamentId, activePlayers);
        break;
      case 'reaction':
        gameState = gameEngine.initReactionGame(tournamentId, activePlayers);
        break;
      case 'snake':
        gameState = gameEngine.initSnakeGame(tournamentId, activePlayers);
        break;
      case 'trivia':
        gameState = gameEngine.initTriviaGame(tournamentId, activePlayers);
        break;
    }

    // Notify players
    io.to(tournamentId).emit('round_started', {
      roundNumber,
      roundName: round.name,
      playersInRound: activePlayers.length,
      survivorsNeeded: round.survivors,
      gameState
    });

    // Set round duration (3 minutes per round)
    setTimeout(() => {
      endRound(tournamentId, roundNumber);
    }, 180000); // 3 minutes

  } catch (error) {
    console.error('Start round error:', error);
  }
}

function endRound(tournamentId, roundNumber) {
  try {
    const tournament = tournamentManager.getTournament(tournamentId);
    if (!tournament) return;

    console.log(`🏁 Ending Round ${roundNumber} for tournament ${tournamentId}`);

    // Get player scores from game engine
    const gameState = gameEngine.games.get(tournamentId);
    if (!gameState) return;

    const playerScores = gameState.players.map(p => ({
      walletAddress: p.walletAddress,
      score: p.score || 0
    }));

    // Process round results
    const results = tournamentManager.processRoundResults(tournamentId, roundNumber, playerScores);

    // Notify players
    io.to(tournamentId).emit('round_ended', {
      roundNumber,
      survivors: results.survivors.map(s => ({
        walletAddress: s.walletAddress,
        username: s.username,
        score: s.roundScores[`round${roundNumber}`]
      })),
      eliminated: results.eliminated.map(e => ({
        walletAddress: e.walletAddress,
        username: e.username,
        score: e.roundScores[`round${roundNumber}`]
      })),
      results: results.results
    });

    // Clean up game state
    gameEngine.games.delete(tournamentId);

    // Check if there are more rounds
    if (roundNumber < 3) {
      // Wait 30 seconds before next round
      setTimeout(() => {
        io.to(tournamentId).emit('next_round_countdown', {
          nextRound: roundNumber + 1,
          countdown: 30
        });
      }, 5000);

      setTimeout(() => {
        startRound(tournamentId, roundNumber + 1);
      }, 35000);
    } else {
      // Tournament complete - finalize and pay winners
      setTimeout(() => {
        finalizeTournament(tournamentId);
      }, 5000);
    }

  } catch (error) {
    console.error('End round error:', error);
  }
}

function finalizeTournament(tournamentId) {
  try {
    const winners = tournamentManager.finalizeTournament(tournamentId);
    const tournament = tournamentManager.getTournament(tournamentId);

    console.log(`🏆 Tournament ${tournamentId} COMPLETE!`);

    // Notify all players
    io.to(tournamentId).emit('tournament_completed', {
      winners,
      totalPot: tournament.totalPot,
      netPot: tournament.netPot,
      platformFee: tournament.platformFee
    });

    // TODO: Call Softkoin API to process payouts
    // For each winner, call: POST /api/escrow/release

  } catch (error) {
    console.error('Finalize tournament error:', error);
  }
}

// ============= CLEANUP & START =============

setInterval(() => {
  tournamentManager.cleanupOldTournaments();
}, 3600000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Tournament Server running on port ${PORT}`);
  console.log(`🏆 3-Round Elimination System`);
  console.log(`📦 No database required`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
