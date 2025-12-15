// --- CONFIG ---
const SERVER_URL = "ws://YOUR_RENDER_URL.onrender.com"; // **REPLACE THIS**
const LOBBY_TIERS = [
    { label: "Free Practice", fee: 0, credits: 0, color: "#1E90FF" },
    { label: "$0.50 Test", fee: 0.5, credits: 50, color: "#90EE90" },
    { label: "$1 Entry", fee: 1, credits: 100, color: "#FFD700" },
    { label: "$2 Entry", fee: 2, credits: 200, color: "#FFA500" },
    { label: "$5 Entry", fee: 5, credits: 500, color: "#FF4500" },
    { label: "$10 Entry", fee: 10, credits: 1000, color: "#DC143C" },
    // ... add more tiers ...
];
// --- END CONFIG ---

let ws;
let currentLobbyId;
let localCurrencyRate = 1; // Default to USD rate
let localCurrencySymbol = "USD";

// 1. Fetch Local Currency Rate
async function fetchLocalRate() {
    // For a beginner setup, we use a public API (like exchangerate.host)
    // NOTE: This is for display only and not for staking logic!
    const userCurrency = 'EUR'; // You can try to guess from geolocation later
    try {
        const response = await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=${userCurrency}`);
        const data = await response.json();
        localCurrencyRate = data.rates[userCurrency];
        localCurrencySymbol = userCurrency;
        document.getElementById('local-currency').innerText = `Rates: 1 USD ≈ ${localCurrencyRate.toFixed(2)} ${localCurrencySymbol}`;
        renderLobbies(); // Render after rates are fetched
    } catch (error) {
        console.error("Could not fetch currency rate:", error);
        document.getElementById('local-currency').innerText = "Rates unavailable.";
        renderLobbies();
    }
}

// 2. Render Lobby Cards
function renderLobbies() {
    const container = document.getElementById('lobby-container');
    container.innerHTML = ''; // Clear previous lobbies

    LOBBY_TIERS.forEach((tier, index) => {
        const convertedFee = (tier.fee * localCurrencyRate).toFixed(2);
        const card = document.createElement('div');
        card.className = 'lobby-card';
        card.style.borderLeftColor = tier.color;
        card.innerHTML = `
            <h3>${tier.label}</h3>
            <p>Entry: **$${tier.fee.toFixed(2)}** (${convertedFee} ${localCurrencySymbol})</p>
            <p>Credits to Win: ${tier.credits.toLocaleString()}</p>
            <p id="players-${index}">Players: 0 / 64</p>
            <button onclick="joinLobby('${index}')">JOIN</button>
        `;
        container.appendChild(card);
    });
}

// 3. Connect to Server and Join Lobby
function joinLobby(lobbyIndex) {
    // 1. Show Game Screen
    document.getElementById('lobby-container').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    // 2. Establish WebSocket connection
    ws = new WebSocket(SERVER_URL);
    
    ws.onopen = () => {
        const userId = `User_${Math.floor(Math.random() * 99999)}`; // Simple unique ID
        currentLobbyId = `lobby_${lobbyIndex}`;
        
        console.log(`Connected. Attempting to join ${currentLobbyId}`);
        
        // 3. Send JOIN message
        ws.send(JSON.stringify({ 
            type: 'JOIN_LOBBY', 
            lobbyId: currentLobbyId,
            userId: userId
        }));
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
    };

    ws.onclose = () => {
        console.log("Disconnected from server.");
        // Optional: Show error or return to lobby
    };

    // 4. Game Input Handling (Typing)
    document.getElementById('player-input').addEventListener('input', (e) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'PLAYER_INPUT',
                text: e.target.value
            }));
        }
    });
}

// 4. Handle Server Messages (Game Loop)
function handleServerMessage(message) {
    switch (message.type) {
        case 'LOBBY_UPDATE':
            // This is for the Lobby screen before joining (not needed after join)
            // But useful for status updates (e.g., player count)
            // You would use a separate 'status' endpoint for this in production
            break;
        case 'PLAYER_COUNT':
            document.getElementById('countdown').innerText = `Players: ${message.count} / 64`;
            break;
        case 'COUNTDOWN_START':
            document.getElementById('countdown').innerText = `Game starts in: ${message.time} seconds!`;
            break;
        case 'GAME_START':
            document.getElementById('countdown').innerText = `Round 1: Eliminate the bottom 32!`;
            document.getElementById('target-text').innerText = message.targetText;
            document.getElementById('player-input').value = '';
            document.getElementById('player-input').focus();
            break;
        case 'LEADERBOARD_UPDATE':
            // Update live ranking
            const leaderboard = document.getElementById('leaderboard');
            leaderboard.innerHTML = '<h4>Leaderboard</h4>';
            message.players.forEach(p => {
                leaderboard.innerHTML += `<p>${p.rank}. ${p.userId} - WPM: ${p.wpm} ${p.status}</p>`;
            });
            break;
        case 'ELIMINATION_NOTICE':
            alert(`Elimination! ${message.eliminatedCount} players removed. New Round!`);
            document.getElementById('target-text').innerText = message.newTargetText;
            document.getElementById('player-input').value = '';
            break;
        case 'GAME_OVER':
            alert(`Game Over! Winner: ${message.winnerId}`);
            // TODO: Display results, offer to rejoin
            break;
    }
}

// Initialization
fetchLocalRate();
