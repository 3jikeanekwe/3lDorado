const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from your Vercel frontend
    methods: ["GET", "POST"]
  }
});

// Game State Storage
const LOBBIES = {}; // Format: { "tier_10": { players: [], state: 'waiting' } }
const MAX_PLAYERS = 64;

// Initialize Lobbies for each Tier
const TIERS = [0, 0.5, 1, 2, 5, 10, 25, 50, 100];
TIERS.forEach(tier => {
  const lobbyId = `tier_${tier}`;
  LOBBIES[lobbyId] = {
    id: lobbyId,
    cost: tier,
    players: [], // Array of socket.ids
    state: 'waiting', // waiting, countdown, active, ended
    eliminated: []
  };
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // 1. Join a Lobby
  socket.on('join_lobby', ({ tier }) => {
    const lobbyId = `tier_${tier}`;
    const lobby = LOBBIES[lobbyId];

    if (!lobby) return;

    if (lobby.players.length >= MAX_PLAYERS) {
      socket.emit('error', 'Lobby is full');
      return;
    }

    if (lobby.state !== 'waiting') {
      socket.emit('error', 'Game already in progress');
      return;
    }

    // Add player
    lobby.players.push({ id: socket.id, score: 0, alive: true });
    socket.join(lobbyId);

    // Broadcast update to everyone in that room
    io.to(lobbyId).emit('lobby_update', {
      count: lobby.players.length,
      max: MAX_PLAYERS,
      players: lobby.players
    });

    // Check if full to start countdown
    if (lobby.players.length === MAX_PLAYERS) {
      startCountdown(lobbyId);
    }
  });

  // 2. Handle Game Actions (e.g., Typing/Clicking)
  socket.on('submit_score', ({ tier, score }) => {
    const lobbyId = `tier_${tier}`;
    const lobby = LOBBIES[lobbyId];
    
    // Find player and update score
    const player = lobby.players.find(p => p.id === socket.id);
    if (player && player.alive) {
      player.score = score;
      // Broadcast live leaderboard to room
      io.to(lobbyId).emit('leaderboard_update', lobby.players);
    }
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    // Remove player from all lobbies they are in
    TIERS.forEach(tier => {
      const lobbyId = `tier_${tier}`;
      const lobby = LOBBIES[lobbyId];
      const index = lobby.players.findIndex(p => p.id === socket.id);
      
      if (index !== -1) {
        lobby.players.splice(index, 1);
        io.to(lobbyId).emit('lobby_update', {
          count: lobby.players.length,
          max: MAX_PLAYERS,
          players: lobby.players
        });
      }
    });
  });
});

function startCountdown(lobbyId) {
  const lobby = LOBBIES[lobbyId];
  lobby.state = 'countdown';
  let count = 60; // 1 minute countdown as requested

  const interval = setInterval(() => {
    io.to(lobbyId).emit('timer_update', count);
    count--;

    if (count < 0) {
      clearInterval(interval);
      startGame(lobbyId);
    }
  }, 1000);
}

function startGame(lobbyId) {
  const lobby = LOBBIES[lobbyId];
  lobby.state = 'active';
  io.to(lobbyId).emit('game_start', { message: 'GO!' });

  // SIMULATION: End game after 30 seconds for testing
  setTimeout(() => {
    endGame(lobbyId);
  }, 30000);
}

function endGame(lobbyId) {
  const lobby = LOBBIES[lobbyId];
  lobby.state = 'ended';
  
  // Sort by score
  const sorted = lobby.players.sort((a, b) => b.score - a.score);
  const winners = sorted.slice(0, 8); // Top 8

  io.to(lobbyId).emit('game_over', { 
    winners: winners,
    rankings: sorted 
  });

  // Reset lobby after 10 seconds
  setTimeout(() => {
    lobby.players = [];
    lobby.state = 'waiting';
    io.to(lobbyId).emit('lobby_reset');
  }, 10000);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Game Server running on port ${PORT}`);
});
