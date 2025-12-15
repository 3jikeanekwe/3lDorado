// Game logic for all 8 games
class GameEngine {
  constructor() {
    this.games = new Map(); // sessionId -> game state
  }

  // ============= TYPING GAME =============
  initTypingGame(sessionId, players) {
    const words = [
      'javascript', 'python', 'blockchain', 'crypto', 'gaming',
      'multiplayer', 'tournament', 'champion', 'victory', 'strategy',
      'performance', 'algorithm', 'database', 'network', 'security'
    ];

    const gameState = {
      type: 'typing',
      sessionId,
      players: players.map(p => ({
        ...p,
        score: 0,
        wordsTyped: 0,
        errors: 0,
        accuracy: 100
      })),
      currentWord: words[Math.floor(Math.random() * words.length)],
      wordList: words,
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  processTypingInput(sessionId, walletAddress, input) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    if (input.toLowerCase().trim() === game.currentWord.toLowerCase()) {
      player.score += 10;
      player.wordsTyped++;
      game.currentWord = game.wordList[Math.floor(Math.random() * game.wordList.length)];
      return { success: true, newWord: game.currentWord, score: player.score };
    } else {
      player.errors++;
      player.accuracy = Math.max(0, 100 - (player.errors * 5));
      return { success: false };
    }
  }

  // ============= RUNNER GAME =============
  initRunnerGame(sessionId, players) {
    const gameState = {
      type: 'runner',
      sessionId,
      players: players.map(p => ({
        ...p,
        distance: 0,
        lives: 3,
        speed: 10
      })),
      obstacles: this.generateObstacles(100),
      trackLength: 5000,
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  processRunnerAction(sessionId, walletAddress, action) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    // Move player forward
    player.distance += player.speed;

    // Check for obstacles
    const nearbyObstacle = game.obstacles.find(
      obs => Math.abs(obs.position - player.distance) < 20
    );

    if (nearbyObstacle) {
      const correctAction = nearbyObstacle.type === 'high' ? 'jump' : 'duck';
      if (action !== correctAction) {
        player.lives--;
        if (player.lives <= 0) {
          player.isEliminated = true;
          return { eliminated: true, distance: player.distance };
        }
        return { hit: true, lives: player.lives, distance: player.distance };
      }
    }

    player.score = player.distance;
    return { distance: player.distance, lives: player.lives };
  }

  generateObstacles(count) {
    const obstacles = [];
    for (let i = 0; i < count; i++) {
      obstacles.push({
        position: (i + 1) * 50,
        type: Math.random() > 0.5 ? 'high' : 'low'
      });
    }
    return obstacles;
  }

  // ============= SHOOTER GAME =============
  initShooterGame(sessionId, players) {
    const gameState = {
      type: 'shooter',
      sessionId,
      players: players.map(p => ({
        ...p,
        kills: 0,
        accuracy: 0,
        shots: 0
      })),
      targets: this.generateTargets(30),
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  processShooterAction(sessionId, walletAddress, targetX, targetY) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    player.shots++;

    // Check if hit any target (within 30px radius)
    const hitIndex = game.targets.findIndex(
      t => Math.sqrt(Math.pow(t.x - targetX, 2) + Math.pow(t.y - targetY, 2)) < 30
    );

    if (hitIndex !== -1) {
      player.kills++;
      player.score = player.kills * 10;
      player.accuracy = Math.round((player.kills / player.shots) * 100);
      
      // Replace hit target
      game.targets[hitIndex] = this.generateTarget();
      
      return { hit: true, score: player.score, kills: player.kills };
    }

    player.accuracy = Math.round((player.kills / player.shots) * 100);
    return { hit: false };
  }

  generateTargets(count) {
    return Array.from({ length: count }, () => this.generateTarget());
  }

  generateTarget() {
    return {
      x: Math.random() * 800,
      y: Math.random() * 600
    };
  }

  // ============= MEMORY GAME =============
  initMemoryGame(sessionId, players) {
    const gameState = {
      type: 'memory',
      sessionId,
      players: players.map(p => ({
        ...p,
        matches: 0,
        attempts: 0,
        currentPair: []
      })),
      cards: this.generateMemoryCards(),
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  generateMemoryCards() {
    const emojis = ['🎮', '🎯', '🎲', '🎰', '🃏', '🎪', '🎨', '🎭', '🎺', '🎸', '🎹', '🥁', '🎬', '🎤', '🎧', '🎼'];
    const pairs = emojis.slice(0, 8);
    const cards = [...pairs, ...pairs].map((emoji, id) => ({
      id,
      emoji,
      flipped: false,
      matched: false
    }));
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  processMemoryFlip(sessionId, walletAddress, cardId) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    const card = game.cards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return null;

    card.flipped = true;
    player.currentPair.push(card);

    if (player.currentPair.length === 2) {
      player.attempts++;
      const [card1, card2] = player.currentPair;

      if (card1.emoji === card2.emoji) {
        // Match!
        card1.matched = true;
        card2.matched = true;
        player.matches++;
        player.score = player.matches * 10;
        player.currentPair = [];
        return { match: true, score: player.score };
      } else {
        // No match - flip back after delay
        setTimeout(() => {
          card1.flipped = false;
          card2.flipped = false;
        }, 1000);
        player.currentPair = [];
        return { match: false };
      }
    }

    return { flipped: true };
  }

  // ============= MATH GAME =============
  initMathGame(sessionId, players) {
    const gameState = {
      type: 'math',
      sessionId,
      players: players.map(p => ({
        ...p,
        correct: 0,
        incorrect: 0
      })),
      currentProblem: this.generateMathProblem(),
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  generateMathProblem() {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let num1, num2, answer;

    switch(op) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 10;
        num2 = Math.floor(Math.random() * 50) + 10;
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 50;
        num2 = Math.floor(Math.random() * 30) + 10;
        answer = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 12) + 2;
        num2 = Math.floor(Math.random() * 12) + 2;
        answer = num1 * num2;
        break;
    }

    return {
      question: `${num1} ${op} ${num2}`,
      answer
    };
  }

  processMathAnswer(sessionId, walletAddress, answer) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    const correct = parseInt(answer) === game.currentProblem.answer;
    
    if (correct) {
      player.correct++;
      player.score = player.correct * 10;
    } else {
      player.incorrect++;
    }

    game.currentProblem = this.generateMathProblem();

    return { 
      correct, 
      newProblem: game.currentProblem,
      score: player.score 
    };
  }

  // ============= REACTION GAME =============
  initReactionGame(sessionId, players) {
    const gameState = {
      type: 'reaction',
      sessionId,
      players: players.map(p => ({
        ...p,
        clicks: 0,
        avgReactionTime: 0,
        reactions: []
      })),
      currentTarget: null,
      targetAppearTime: null,
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    this.spawnReactionTarget(sessionId);
    return gameState;
  }

  spawnReactionTarget(sessionId) {
    const game = this.games.get(sessionId);
    if (!game) return;

    game.currentTarget = {
      x: Math.random() * 700 + 50,
      y: Math.random() * 500 + 50
    };
    game.targetAppearTime = Date.now();

    // Auto-remove after 2 seconds
    setTimeout(() => {
      if (game.currentTarget) {
        game.currentTarget = null;
        setTimeout(() => this.spawnReactionTarget(sessionId), 500);
      }
    }, 2000);
  }

  processReactionClick(sessionId, walletAddress, clickX, clickY) {
    const game = this.games.get(sessionId);
    if (!game || !game.currentTarget) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    const distance = Math.sqrt(
      Math.pow(game.currentTarget.x - clickX, 2) + 
      Math.pow(game.currentTarget.y - clickY, 2)
    );

    if (distance < 40) {
      const reactionTime = Date.now() - game.targetAppearTime;
      player.clicks++;
      player.reactions.push(reactionTime);
      player.avgReactionTime = player.reactions.reduce((a, b) => a + b, 0) / player.reactions.length;
      player.score = player.clicks * 10;

      game.currentTarget = null;
      setTimeout(() => this.spawnReactionTarget(sessionId), 500);

      return { hit: true, reactionTime, score: player.score };
    }

    return { hit: false };
  }

  // ============= SNAKE GAME =============
  initSnakeGame(sessionId, players) {
    const gameState = {
      type: 'snake',
      sessionId,
      players: players.map(p => ({
        ...p,
        snake: [{ x: 400, y: 300 }],
        direction: 'right',
        foodEaten: 0
      })),
      food: { x: 200, y: 200 },
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  processSnakeMove(sessionId, walletAddress, direction) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated) return null;

    // Update direction (prevent 180 degree turns)
    const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (direction !== opposites[player.direction]) {
      player.direction = direction;
    }

    // Move snake
    const head = { ...player.snake[0] };
    switch(player.direction) {
      case 'up': head.y -= 20; break;
      case 'down': head.y += 20; break;
      case 'left': head.x -= 20; break;
      case 'right': head.x += 20; break;
    }

    // Check wall collision
    if (head.x < 0 || head.x >= 800 || head.y < 0 || head.y >= 600) {
      player.isEliminated = true;
      return { eliminated: true, score: player.score };
    }

    // Check self collision
    if (player.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      player.isEliminated = true;
      return { eliminated: true, score: player.score };
    }

    player.snake.unshift(head);

    // Check food collision
    if (Math.abs(head.x - game.food.x) < 20 && Math.abs(head.y - game.food.y) < 20) {
      player.foodEaten++;
      player.score = player.foodEaten * 10;
      game.food = {
        x: Math.floor(Math.random() * 39) * 20,
        y: Math.floor(Math.random() * 29) * 20
      };
    } else {
      player.snake.pop();
    }

    return { snake: player.snake, score: player.score };
  }

  // ============= TRIVIA GAME =============
  initTriviaGame(sessionId, players) {
    const questions = this.getTriviaQuestions();
    
    const gameState = {
      type: 'trivia',
      sessionId,
      players: players.map(p => ({
        ...p,
        correct: 0,
        streak: 0,
        answered: false
      })),
      questions,
      currentQuestion: 0,
      questionStartTime: Date.now(),
      startTime: Date.now()
    };

    this.games.set(sessionId, gameState);
    return gameState;
  }

  getTriviaQuestions() {
    return [
      {
        question: "What is Bitcoin's maximum supply?",
        options: ["18 million", "21 million", "25 million", "Unlimited"],
        correct: 1
      },
      {
        question: "Which blockchain is Ethereum built on?",
        options: ["Its own", "Bitcoin", "Litecoin", "Ripple"],
        correct: 0
      },
      {
        question: "What does NFT stand for?",
        options: ["New File Type", "Non-Fungible Token", "Network File Transfer", "Next Finance Tech"],
        correct: 1
      },
      {
        question: "Who created Bitcoin?",
        options: ["Elon Musk", "Vitalik Buterin", "Satoshi Nakamoto", "Charlie Lee"],
        correct: 2
      },
      {
        question: "What is a blockchain?",
        options: ["A type of coin", "A distributed ledger", "A mining tool", "A wallet"],
        correct: 1
      }
    ];
  }

  processTriviaAnswer(sessionId, walletAddress, answerIndex) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const player = game.players.find(p => p.walletAddress === walletAddress);
    if (!player || player.isEliminated || player.answered) return null;

    const question = game.questions[game.currentQuestion];
    const correct = answerIndex === question.correct;
    const timeBonus = Math.max(0, 10 - Math.floor((Date.now() - game.questionStartTime) / 1000));

    player.answered = true;

    if (correct) {
      player.correct++;
      player.streak++;
      player.score += 10 + timeBonus + (player.streak * 2);
    } else {
      player.streak = 0;
    }

    return { correct, score: player.score };
  }

  nextTriviaQuestion(sessionId) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    game.currentQuestion++;
    game.questionStartTime = Date.now();
    game.players.forEach(p => p.answered = false);

    return game.currentQuestion < game.questions.length;
  }

  // ============= CALCULATE RANKINGS =============
  calculateRankings(sessionId) {
    const game = this.games.get(sessionId);
    if (!game) return null;

    const rankings = [...game.players]
      .filter(p => !p.isEliminated || p.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        rank: index + 1,
        walletAddress: player.walletAddress,
        username: player.username,
        score: player.score
      }));

    return rankings;
  }
}

export default new GameEngine();
