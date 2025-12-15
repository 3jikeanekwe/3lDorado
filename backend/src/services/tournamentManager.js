// File: backend/src/services/tournamentManager.js

class TournamentManager {
  constructor() {
    this.tournaments = new Map(); // tournamentId -> tournament data
  }

  // Create new tournament
  createTournament(gameType, tier) {
    const tournamentId = `${gameType}_${tier}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tournament = {
      id: tournamentId,
      gameType,
      tier,
      players: [],
      maxPlayers: 64,
      status: 'waiting', // waiting, round1, round2, round3, completed
      currentRound: 0,
      rounds: [
        { 
          roundNumber: 1, 
          name: 'The Purge',
          startPlayers: 64, 
          survivors: 32,
          status: 'pending',
          startTime: null,
          endTime: null,
          results: []
        },
        { 
          roundNumber: 2, 
          name: 'The Filter',
          startPlayers: 32, 
          survivors: 8,
          status: 'pending',
          startTime: null,
          endTime: null,
          results: []
        },
        { 
          roundNumber: 3, 
          name: 'The Money Round',
          startPlayers: 8, 
          survivors: 8,
          status: 'pending',
          startTime: null,
          endTime: null,
          results: []
        }
      ],
      totalPot: 0,
      netPot: 0, // After platform fees
      platformFee: 0,
      finalWinners: [],
      createdAt: Date.now()
    };

    this.tournaments.set(tournamentId, tournament);
    console.log(`🏆 Created tournament: ${tournamentId}`);
    return tournament;
  }

  // Find waiting tournament
  findWaitingTournament(gameType, tier, walletAddress) {
    for (const [tournamentId, tournament] of this.tournaments) {
      if (
        tournament.gameType === gameType &&
        tournament.tier === tier &&
        tournament.status === 'waiting' &&
        tournament.players.length < tournament.maxPlayers &&
        !tournament.players.find(p => p.walletAddress === walletAddress)
      ) {
        return tournament;
      }
    }
    return null;
  }

  // Add player to tournament
  addPlayer(tournamentId, playerData) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournament not found');
    
    if (tournament.players.length >= tournament.maxPlayers) {
      throw new Error('Tournament is full');
    }

    // Check if player already in tournament
    const exists = tournament.players.find(p => p.walletAddress === playerData.walletAddress);
    if (exists) return tournament;

    tournament.players.push({
      walletAddress: playerData.walletAddress,
      username: playerData.username || 'Anonymous',
      joinedAt: Date.now(),
      currentRound: 1,
      isEliminated: false,
      eliminatedInRound: null,
      finalRank: null,
      totalScore: 0,
      roundScores: {}
    });

    // Calculate pot when full
    if (tournament.players.length === tournament.maxPlayers) {
      this.calculatePot(tournamentId);
      tournament.status = 'ready'; // Ready to start Round 1
    }

    return tournament;
  }

  // Calculate tournament pot and fees
  calculatePot(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const entryFee = tournament.tier;
    const totalPlayers = tournament.players.length;
    
    tournament.totalPot = entryFee * totalPlayers;
    
    // Platform fees: 5% of pool + 0.5% per player stake
    const poolFee = tournament.totalPot * 0.05;
    const stakeFees = totalPlayers * (entryFee * 0.005);
    tournament.platformFee = poolFee + stakeFees;
    
    tournament.netPot = tournament.totalPot - tournament.platformFee;

    console.log(`💰 Tournament ${tournamentId} pot calculated:`);
    console.log(`   Total: $${tournament.totalPot}`);
    console.log(`   Fees: $${tournament.platformFee.toFixed(2)}`);
    console.log(`   Net: $${tournament.netPot.toFixed(2)}`);
  }

  // Calculate prize distribution for final 8
  calculatePrizeDistribution(netPot) {
    return {
      1: { percentage: 0.40, amount: netPot * 0.40, roi: 24 },    // 40% - Champion
      2: { percentage: 0.20, amount: netPot * 0.20, roi: 12 },    // 20%
      3: { percentage: 0.10, amount: netPot * 0.10, roi: 6 },     // 10%
      4: { percentage: 0.08, amount: netPot * 0.08, roi: 4.8 },   // 8%
      5: { percentage: 0.055, amount: netPot * 0.055, roi: 3.3 }, // 5.5%
      6: { percentage: 0.055, amount: netPot * 0.055, roi: 3.3 }, // 5.5%
      7: { percentage: 0.055, amount: netPot * 0.055, roi: 3.3 }, // 5.5%
      8: { percentage: 0.055, amount: netPot * 0.055, roi: 3.3 }  // 5.5%
    };
  }

  // Process round results
  processRoundResults(tournamentId, roundNumber, playerScores) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    const round = tournament.rounds[roundNumber - 1];
    
    // Sort players by score (highest first)
    const sortedPlayers = playerScores
      .map(ps => ({
        ...ps,
        player: tournament.players.find(p => p.walletAddress === ps.walletAddress)
      }))
      .sort((a, b) => b.score - a.score);

    // Determine survivors
    const survivorCount = round.survivors;
    const survivors = sortedPlayers.slice(0, survivorCount);
    const eliminated = sortedPlayers.slice(survivorCount);

    // Update player data
    survivors.forEach((s, index) => {
      s.player.roundScores[`round${roundNumber}`] = s.score;
      s.player.totalScore += s.score;
      s.player.currentRound = roundNumber + 1;
    });

    eliminated.forEach(e => {
      e.player.isEliminated = true;
      e.player.eliminatedInRound = roundNumber;
      e.player.roundScores[`round${roundNumber}`] = e.score;
      e.player.totalScore += e.score;
    });

    // Save round results
    round.results = sortedPlayers.map((s, index) => ({
      rank: index + 1,
      walletAddress: s.walletAddress,
      username: s.player.username,
      score: s.score,
      survived: index < survivorCount,
      eliminated: index >= survivorCount
    }));
    round.status = 'completed';
    round.endTime = Date.now();

    console.log(`🎯 Round ${roundNumber} completed: ${survivors.length} survivors, ${eliminated.length} eliminated`);

    return {
      survivors: survivors.map(s => s.player),
      eliminated: eliminated.map(e => e.player),
      results: round.results
    };
  }

  // Finalize tournament and calculate final prizes
  finalizeTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    // Get final 8 players sorted by total score
    const final8 = tournament.players
      .filter(p => !p.isEliminated)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 8);

    // Calculate prizes
    const prizes = this.calculatePrizeDistribution(tournament.netPot);

    // Assign final ranks and prizes
    final8.forEach((player, index) => {
      player.finalRank = index + 1;
      player.prize = prizes[index + 1].amount;
      player.roi = prizes[index + 1].roi;
    });

    tournament.finalWinners = final8.map(p => ({
      rank: p.finalRank,
      walletAddress: p.walletAddress,
      username: p.username,
      totalScore: p.totalScore,
      prize: p.prize,
      roi: p.roi
    }));

    tournament.status = 'completed';

    console.log(`🏆 Tournament ${tournamentId} completed!`);
    console.log(`   Champion: ${final8[0].username} wins $${final8[0].prize.toFixed(2)}`);

    return tournament.finalWinners;
  }

  // Get active players for current round
  getActivePlayers(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return [];

    return tournament.players.filter(p => !p.isEliminated);
  }

  // Get tournament status
  getTournamentStatus(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    const currentRound = tournament.rounds[tournament.currentRound];
    const activePlayers = this.getActivePlayers(tournamentId);

    return {
      id: tournament.id,
      gameType: tournament.gameType,
      tier: tournament.tier,
      status: tournament.status,
      currentRound: tournament.currentRound + 1,
      roundName: currentRound?.name,
      totalPlayers: tournament.players.length,
      activePlayers: activePlayers.length,
      totalPot: tournament.totalPot,
      netPot: tournament.netPot,
      rounds: tournament.rounds.map(r => ({
        number: r.roundNumber,
        name: r.name,
        status: r.status,
        startPlayers: r.startPlayers,
        survivors: r.survivors
      }))
    };
  }

  // Update tournament status for round progression
  startRound(tournamentId, roundNumber) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    tournament.currentRound = roundNumber - 1;
    tournament.status = `round${roundNumber}`;
    
    const round = tournament.rounds[roundNumber - 1];
    round.status = 'active';
    round.startTime = Date.now();

    console.log(`🎮 Tournament ${tournamentId} - Starting ${round.name} (Round ${roundNumber})`);

    return round;
  }

  // Get tournament by ID
  getTournament(tournamentId) {
    return this.tournaments.get(tournamentId);
  }

  // Clean up old tournaments
  cleanupOldTournaments() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [tournamentId, tournament] of this.tournaments) {
      if (tournament.status === 'completed' && tournament.createdAt < oneHourAgo) {
        this.tournaments.delete(tournamentId);
        console.log(`🧹 Cleaned up tournament: ${tournamentId}`);
      }
    }
  }
}

export default new TournamentManager();
