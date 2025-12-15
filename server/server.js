const WebSocket = require('ws');
const http = require('http');

// Simple Text Generator (In a real app, this would be complex)
function generateRandomText(length = 20) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result.trim();
}

// --- GLOBAL GAME STATE ---
const LOBBY_CAPACITY = 64;
const LOBBIES = {}; // Store all active lobbies

// Helper to calculate WPM
function calculateWPM(textLength, startTime, endTime) {
    const timeInMinutes = (endTime - startTime) / 60000;
    const words = textLength / 5; // Standard WPM calc (5 characters per word)
    return timeInMinutes > 0 ? Math.round(words / timeInMinutes) : 0;
}

// --- SERVER SETUP ---
const server = http.createServer((req, res) => {
    // Render needs a response to health checks
    res.writeHead(200);
    res.end('Skill Royale Server is Running');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        
        if (data.type === 'JOIN_LOBBY') {
            handleJoinLobby(ws, data.lobbyId, data.userId);
        } else if (data.type === 'PLAYER_INPUT') {
            handlePlayerInput(ws, data.text);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });
});

// --- CORE GAME FUNCTIONS ---

function handleJoinLobby(ws, lobbyId, userId) {
    if (!LOBBIES[lobbyId]) {
        LOBBIES[lobbyId] = {
            players: new Map(),
            targetText: generateRandomText(50),
            status: 'WAITING',
            round: 0,
            countdownTimer: null
        };
    }
    
    const lobby = LOBBIES[lobbyId];
    
    // Check if lobby is full
    if (lobby.players.size >= LOBBY_CAPACITY && lobby.status === 'WAITING') {
        // Simple case: no joining while game is starting/running
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Lobby is full or game is in progress.' }));
        ws.close();
        return;
    }
    
    // Add player to the map
    ws.userId = userId;
    ws.lobbyId = lobbyId;
    lobby.players.set(userId, {
        ws: ws,
        score: 0,
        lastInput: '',
        wpm: 0,
        eliminated: false,
        startTime: Date.now()
    });

    // Notify all players in lobby
    broadcast(lobbyId, { type: 'PLAYER_COUNT', count: lobby.players.size });

    console.log(`User ${userId} joined ${lobbyId}. Total: ${lobby.players.size}`);

    // Check for game start
    if (lobby.players.size === LOBBY_CAPACITY && lobby.status === 'WAITING') {
        lobby.status = 'COUNTDOWN';
        startCountdown(lobbyId);
    }
}

function startCountdown(lobbyId) {
    const lobby = LOBBIES[lobbyId];
    let count = 60; // 1 minute countdown

    lobby.countdownTimer = setInterval(() => {
        broadcast(lobbyId, { type: 'COUNTDOWN_START', time: count });
        count--;

        if (count < 0) {
            clearInterval(lobby.countdownTimer);
            lobby.status = 'RUNNING';
            lobby.round = 1;
            
            // Send initial game text
            broadcast(lobbyId, { 
                type: 'GAME_START', 
                targetText: lobby.targetText 
            });

            // Set timer for first elimination round (e.g., 60 seconds)
            setTimeout(() => runEliminationRound(lobbyId), 60000);
        }
    }, 1000);
}

function handlePlayerInput(ws, text) {
    const lobby = LOBBIES[ws.lobbyId];
    if (!lobby || lobby.status !== 'RUNNING' || lobby.players.get(ws.userId).eliminated) return;

    const playerState = lobby.players.get(ws.userId);
    playerState.lastInput = text;

    // Check for completion
    if (text === lobby.targetText) {
        // Player completed the text! This is their score for the round.
        playerState.score += 1;
        playerState.wpm = calculateWPM(lobby.targetText.length, playerState.startTime, Date.now());
        playerState.startTime = Date.now(); // Reset start time for next round
        playerState.lastInput = ''; // Clear input for next round
        
        // In a real game, you would assign new text immediately. 
        // For this simple test, we will let them wait for the round timer.
    }
    
    // Update WPM for leaderboard (even if not finished)
    if (text.length > 0) {
        playerState.wpm = calculateWPM(text.length, playerState.startTime, Date.now());
    }

    sendLeaderboardUpdate(ws.lobbyId);
}

function runEliminationRound(lobbyId) {
    const lobby = LOBBIES[lobbyId];
    if (!lobby || lobby.status !== 'RUNNING') return;

    const activePlayers = Array.from(lobby.players.values()).filter(p => !p.eliminated);
    
    // --- ELIMINATION LOGIC (Model B: Survivor) ---
    // Sort by WPM (or score if round completed)
    activePlayers.sort((a, b) => b.wpm - a.wpm); 

    let playersToEliminate;
    let newTargetText = generateRandomText(60); // Harder text
    
    if (lobby.round === 1) {
        // 64 -> 32
        playersToEliminate = activePlayers.slice(32); 
        lobby.round = 2;
        
    } else if (lobby.round === 2) {
        // 32 -> 8
        playersToEliminate = activePlayers.slice(8); 
        lobby.round = 3;
        
    } else if (lobby.round === 3) {
        // 8 -> 1 (Final Round)
        playersToEliminate = activePlayers.slice(1);
        lobby.round = 4; // Indicates final elimination step
    } else {
        // Should not happen
        return; 
    }

    // Mark players as eliminated
    playersToEliminate.forEach(p => {
        p.eliminated = true;
        p.ws.send(JSON.stringify({ type: 'GAME_OVER', message: 'ELIMINATED! Better luck next time.' }));
        p.ws.close();
        lobby.players.delete(p.ws.userId); // Remove from active map
    });

    const remainingPlayers = Array.from(lobby.players.values()).filter(p => !p.eliminated);

    if (remainingPlayers.length <= 1) {
        // Game Over - Final Winner
        const winner = remainingPlayers[0];
        lobby.status = 'FINISHED';
        broadcast(lobbyId, { type: 'GAME_OVER', winnerId: winner ? winner.ws.userId : 'N/A' });
        delete LOBBIES[lobbyId]; // Clean up lobby
        return;
    }

    // Send next round notice
    broadcast(lobbyId, { 
        type: 'ELIMINATION_NOTICE', 
        eliminatedCount: playersToEliminate.length,
        newTargetText: newTargetText
    });

    lobby.targetText = newTargetText;

    // Reset player start times for the new round
    remainingPlayers.forEach(p => { p.startTime = Date.now(); p.wpm = 0; });

    // Set timer for next elimination
    setTimeout(() => runEliminationRound(lobbyId), 60000); // 60 seconds per round
}


// --- UTILITY FUNCTIONS ---

function broadcast(lobbyId, message) {
    const lobby = LOBBIES[lobbyId];
    if (!lobby) return;
    
    const messageString = JSON.stringify(message);
    
    lobby.players.forEach(p => {
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(messageString);
        }
    });
}

function sendLeaderboardUpdate(lobbyId) {
    const lobby = LOBBIES[lobbyId];
    if (!lobby) return;

    const players = Array.from(lobby.players.values())
        .filter(p => !p.eliminated)
        .sort((a, b) => b.wpm - a.wpm)
        .map((p, index) => ({
            rank: index + 1,
            userId: p.ws.userId,
            wpm: p.wpm,
            status: p.lastInput === lobby.targetText ? ' (Finished!)' : ''
        }));

    broadcast(lobbyId, { type: 'LEADERBOARD_UPDATE', players: players });
}

function handleDisconnect(ws) {
    if (!ws.lobbyId || !ws.userId) return;

    const lobby = LOBBIES[ws.lobbyId];
    if (lobby && lobby.players.has(ws.userId)) {
        lobby.players.delete(ws.userId);
        console.log(`User ${ws.userId} disconnected from ${ws.lobbyId}. Remaining: ${lobby.players.size}`);
        broadcast(ws.lobbyId, { type: 'PLAYER_COUNT', count: lobby.players.size });
        // If player disconnects during running, they are treated as eliminated.
    }
}

// Keep connection alive for Render (Ping-Pong)
setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // 30 seconds

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
