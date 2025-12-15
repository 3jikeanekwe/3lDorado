class GameEngine {
  constructor() {
    this.games = new Map(); // sessionId -> game state
    this.wordLists = {
      easy: ['cat', 'dog', 'sun', 'car', 'hat', 'pen', 'cup'],
      medium: ['house', 'water', 'phone', 'chair', 'table'],
      hard: ['computer', 'keyboard', 'elephant', 'umbrella']
    };
  }

  // Initialize typing game
  initTypingGame(sessionId, players) {
    const gameState = {
      type: 'typing',
      sessionId,
      players: players.map(p => ({
        ...p,
        score: 0,
        currentWord: null,
        wordsTyped: 0,
        accuracy: 100,
        isEliminated: false
      })),
      round: 1,
      maxRounds: 5,
      currentWord: this.getRandomWord('medium'),
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  // Initialize runner game
  initRunnerGame(sessionId, players) {
    const gameState = {
      type: 'runner',
      sessionId,
      players: players.map(p => ({
        ...p,
        position: 0,
        distance: 0,
        speed: 0,
        isEliminated: false
      })),
      trackLength: 1000,
      obstacles: this.generateObstacles(1000),
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  // Initialize shooter game
  initShooterGame(sessionId, players) {
    const gameState = {
      type: 'shooter',
      sessionId,
      players: players.map(p => ({
        ...p,
        x: Math.random() * 800,
        y: Math.random() * 600,
        health: 100,
        kills: 0,
        deaths: 0,
        isEliminated: false
      })),
      targets: this.generateTargets(20),
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  // Process typing input
  processTypingInput(sessionId, walletAddress, input) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    // Check if input matches current word
    if (input.toLowerCase() === game.currentWord.toLowerCase()) {
      player.score += 10;
      player.wordsTyped++;
      
      // Generate new word
      game.currentWord = this.getRandomWord('medium');
      
      return { success: true, newWord: game.currentWord, score: player.score };
    }

    return { success: false };
  }

  // Process runner movement
  processRunnerMovement(sessionId, walletAddress, action) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    // Update player position based on action
    switch(action) {
      case 'jump':
        player.position += 15;
        break;
      case 'duck':
        player.position += 5;
        break;
      case 'run':
        player.position += 10;
        break;
    }

    player.distance = player.position;

    // Check if hit obstacle
    const nearObstacles = game.obstacles.filter(
      o => Math.abs(o.position - player.position) < 10
    );

    if (nearObstacles.length > 0 && action !== nearObstacles[0].avoid) {
      player.isEliminated = true;
      return { eliminated: true };
    }

    return { position: player.position, distance: player.distance };
  }

  // Process shooter action
  processShooterAction(sessionId, walletAddress, action, data) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    switch(action) {
      case 'move':
        player.x = Math.max(0, Math.min(800, data.x));
        player.y = Math.max(0, Math.min(600, data.y));
        break;
      
      case 'shoot':
        // Check if hit target
        const target = game.targets.find(t => 
          Math.abs(t.x - data.targetX) < 20 && 
          Math.abs(t.y - data.targetY) < 20
        );
        
        if (target) {
          player.kills++;
          player.score += 5;
          // Remove hit target
          game.targets = game.targets.filter(t => t !== target);
          // Generate new target
          game.targets.push(this.generateTarget());
          return { hit: true, score: player.score };
        }
        break;
    }

    return { x: player.x, y: player.y };
  }

  // Calculate final rankings
  calculateRankings(sessionId) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    // Sort players by score
    const rankings = [...game.players]
      .filter(p => !p.isEliminated)
      .sort((a, b) => {
        if (game.type === 'typing') return b.score - a.score;
        if (game.type === 'runner') return b.distance - a.distance;
        if (game.type === 'shooter') return b.kills - a.kills;
        return 0;
      })
      .map((player, index) => ({
        rank: index + 1,
        walletAddress: player.walletAddress,
        score: player.score || player.distance || player.kills
      }));

    return rankings;
  }

  // Helper methods
  getRandomWord(difficulty) {
    const words = this.wordLists[difficulty];
    return words[Math.floor(Math.random() * words.length)];
  }

  generateObstacles(trackLength) {
    const obstacles = [];
    for (let i = 100; i < trackLength; i += 50) {
      obstacles.push({
        position: i,
        type: Math.random() > 0.5 ? 'high' : 'low',
        avoid: Math.random() > 0.5 ? 'jump' : 'duck'
      });
    }
    return obstacles;
  }

  generateTargets(count) {
    return Array.from({ length: count }, () => this.generateTarget());
  }

  generateTarget() {
    return {
      x: Math.random() * 800,
      y: Math.random() * 600,
      radius: 15
    };
  }
}

export default new GameEngine();
