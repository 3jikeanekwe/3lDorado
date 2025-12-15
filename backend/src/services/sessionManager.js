// Manages all active game sessions in memory
class SessionManager {
  constructor() {
    // Map of sessionId -> session data
    this.sessions = new Map();
    // Map of walletAddress -> sessionId (to track which session a user is in)
    this.userSessions = new Map();
  }

  // Create new session
  createSession(gameType, tier) {
    const sessionId = `${gameType}_${tier}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      gameType,
      tier,
      players: [],
      maxPlayers: 64,
      status: 'waiting', // waiting, countdown, active, completed, cancelled
      createdAt: Date.now(),
      startTime: null,
      endTime: null,
      gameState: null,
      winners: []
    };

    this.sessions.set(sessionId, session);
    console.log(`✅ Created session: ${sessionId}`);
    return session;
  }

  // Find waiting session for game type and tier
  findWaitingSession(gameType, tier, walletAddress) {
    for (const [sessionId, session] of this.sessions) {
      if (
        session.gameType === gameType &&
        session.tier === tier &&
        session.status === 'waiting' &&
        session.players.length < session.maxPlayers &&
        !session.players.find(p => p.walletAddress === walletAddress)
      ) {
        return session;
      }
    }
    return null;
  }

  // Add player to session
  addPlayer(sessionId, playerData) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    if (session.players.length >= session.maxPlayers) {
      throw new Error('Session is full');
    }

    // Check if player already in session
    const exists = session.players.find(p => p.walletAddress === playerData.walletAddress);
    if (exists) return session;

    session.players.push({
      walletAddress: playerData.walletAddress,
      username: playerData.username || 'Anonymous',
      joinedAt: Date.now(),
      score: 0,
      rank: null,
      isEliminated: false
    });

    // Track user's session
    this.userSessions.set(playerData.walletAddress, sessionId);

    // Update session status if full
    if (session.players.length === session.maxPlayers) {
      session.status = 'countdown';
    }

    return session;
  }

  // Remove player from session
  removePlayer(sessionId, walletAddress) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.players = session.players.filter(p => p.walletAddress !== walletAddress);
    this.userSessions.delete(walletAddress);

    // Delete session if empty and waiting
    if (session.players.length === 0 && session.status === 'waiting') {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  // Get session by ID
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Get user's current session
  getUserSession(walletAddress) {
    const sessionId = this.userSessions.get(walletAddress);
    return sessionId ? this.sessions.get(sessionId) : null;
  }

  // Update session status
  updateSessionStatus(sessionId, status) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      if (status === 'active') session.startTime = Date.now();
      if (status === 'completed') session.endTime = Date.now();
    }
    return session;
  }

  // Get all waiting sessions for a game type
  getWaitingLobbies(gameType) {
    const lobbies = [];
    for (const [sessionId, session] of this.sessions) {
      if (session.gameType === gameType && session.status === 'waiting') {
        lobbies.push({
          sessionId,
          tier: session.tier,
          currentPlayers: session.players.length,
          maxPlayers: session.maxPlayers,
          isFull: session.players.length >= session.maxPlayers
        });
      }
    }
    return lobbies;
  }

  // Clean up old completed sessions (after 1 hour)
  cleanupOldSessions() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [sessionId, session] of this.sessions) {
      if (session.status === 'completed' && session.endTime < oneHourAgo) {
        this.sessions.delete(sessionId);
        console.log(`🧹 Cleaned up old session: ${sessionId}`);
      }
    }
  }
}

export default new SessionManager();
