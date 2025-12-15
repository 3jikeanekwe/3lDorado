import GameSession from '../models/GameSession.js';

class MatchmakingService {
  constructor() {
    this.activeSessions = new Map();
  }

  // Find or create game session
  async findOrCreateSession(gameType, tier, walletAddress) {
    // Find waiting session for this game type and tier
    let session = await GameSession.findOne({
      gameType,
      tier,
      status: 'waiting',
      'players.walletAddress': { $ne: walletAddress } // Not already joined
    });

    // Create new session if none available
    if (!session) {
      session = await GameSession.create({
        gameType,
        tier,
        players: [],
        status: 'waiting'
      });
    }

    // Check if session is full
    if (session.players.length >= session.maxPlayers) {
      // Create new session
      session = await GameSession.create({
        gameType,
        tier,
        players: [],
        status: 'waiting'
      });
    }

    return session;
  }

  // Add player to session
  async addPlayer(sessionId, playerData) {
    const session = await GameSession.findById(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.players.length >= session.maxPlayers) {
      throw new Error('Session is full');
    }

    // Check if player already in session
    const existingPlayer = session.players.find(
      p => p.walletAddress === playerData.walletAddress
    );

    if (existingPlayer) {
      return session;
    }

    // Add player
    session.players.push({
      walletAddress: playerData.walletAddress,
      username: playerData.username,
      joinedAt: new Date()
    });

    await session.save();

    // If session full, start countdown
    if (session.players.length === session.maxPlayers) {
      session.status = 'countdown';
      await session.save();
    }

    return session;
  }

  // Remove player from session
  async removePlayer(sessionId, walletAddress) {
    const session = await GameSession.findById(sessionId);
    
    if (!session) return null;

    session.players = session.players.filter(
      p => p.walletAddress !== walletAddress
    );

    if (session.players.length === 0 && session.status === 'waiting') {
      await GameSession.findByIdAndDelete(sessionId);
      return null;
    }

    await session.save();
    return session;
  }

  // Get available lobbies
  async getAvailableLobbies(gameType) {
    const lobbies = await GameSession.find({
      gameType,
      status: 'waiting'
    }).select('tier players maxPlayers createdAt');

    return lobbies.map(lobby => ({
      sessionId: lobby._id,
      tier: lobby.tier,
      currentPlayers: lobby.players.length,
      maxPlayers: lobby.maxPlayers,
      isFull: lobby.players.length >= lobby.maxPlayers
    }));
  }
}

export default new MatchmakingService();
