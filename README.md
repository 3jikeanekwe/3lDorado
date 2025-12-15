# 🎮 64-Player Casino Gaming Platform

A real-time multiplayer gaming platform where 64 players compete simultaneously across 8 different skill-based games. Players bet on their own performance using stablecoins, with winners taking home prizes from the pool.

## 🌟 Features

- **8 Unique Games**: Action, brain, and adventure games for all skill types
- **64 Concurrent Players**: True multiplayer competition
- **Real-time Gameplay**: WebSocket-powered instant updates
- **9 Entry Tiers**: From FREE practice to $100 high-stakes
- **Fair Prize Distribution**: Top 10 players win based on performance
- **No Database Required**: Lightning-fast in-memory sessions
- **Crypto Payments**: Integration with Softkoin wallet (coming soon)

## 🎯 Available Games

### Action Games
- **⌨️ Speed Typing** - Type words faster than opponents
- **🏃 Endless Runner** - Jump and dodge obstacles
- **🎯 Target Shooter** - Hit targets with precision

### Brain Games
- **🎴 Memory Match** - Match pairs in minimum moves
- **🔢 Math Race** - Solve equations lightning fast
- **⚡ Reaction Test** - Click targets with fastest reaction
- **🧠 Trivia Quiz** - Answer crypto/general knowledge

### Adventure Games
- **🐍 Snake Battle** - Grow longest without dying

## 💰 How It Works

### For Players:
1. Choose a game and entry tier ($0 - $100)
2. Join lobby and wait for 64 players
3. Compete in 5-minute game session
4. Top 10 performers win prizes!

### Prize Distribution:
- 🥇 1st Place: 40% of pool
- 🥈 2nd Place: 25% of pool
- 🥉 3rd Place: 15% of pool
- 🏅 4th-10th: 2.86% each (remaining 20%)

### Platform Fees:
- 5% of total prize pool
- 0.5% per individual stake
- Example: $10 tier × 64 players = $640 pool → $35 in fees

## 🏗️ Tech Stack

### Frontend
- React 18 with Vite
- Socket.io Client
- Pure CSS (no frameworks needed)
- Responsive design

### Backend
- Node.js with Express
- Socket.io Server
- In-memory session management
- No database required

### Payment Integration (Coming Soon)
- Softkoin Wallet API
- Escrow smart contracts
- Automatic payouts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (backend)
- GitHub account
- Render account (backend hosting)
- Vercel account (frontend hosting)

### Local Development

1. **Clone Repository**
```bash
git clone https://github.com/yourusername/casino-game-platform.git
cd casino-game-platform
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
npm start
```

3. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

4. **Open Browser**
```
Frontend: http://localhost:5173
Backend: http://localhost:3001
```

## 📦 Deployment

### Backend (Render)
1. Connect GitHub repository
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variable: `NODE_ENV=production`

### Frontend (Vercel)
1. Import GitHub repository
2. Framework: Vite
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Add environment variable: `VITE_BACKEND_URL=<your-render-url>`

## 🎮 Testing

### Test with 2 Players (instead of 64)
Edit `backend/src/services/sessionManager.js`:
```javascript
maxPlayers: 2,  // Change from 64 for testing
```

### Test Free Tier
1. Connect wallet
2. Choose any game
3. Select FREE tier
4. Open multiple browser tabs to simulate players

## 🔐 Security

- No localStorage usage (client-side)
- Wallet address validation
- Escrow-based payments (coming soon)
- Rate limiting on game actions
- Input sanitization

## 📊 Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │ ◄─────► │   Backend    │ ◄─────► │   Softkoin   │
│  (React)    │  WS+API │  (Node.js)   │   API   │   Wallet     │
└─────────────┘         └──────────────┘         └──────────────┘
       │                        │
       │                        ├── Session Manager
       │                        ├── Game Engine
       │                        └── Socket.io
       │
       └── 8 Game Components
```

## 🛠️ Project Structure

```
casino-game-platform/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── sessionManager.js    # Session management
│   │   │   └── gameEngine.js        # Game logic
│   │   └── server.js                # Main server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Lobby.jsx           # Game selection
│   │   │   ├── GameRoom.jsx        # Game container
│   │   │   ├── TypingGame.jsx      # Speed typing
│   │   │   ├── RunnerGame.jsx      # Endless runner
│   │   │   ├── ShooterGame.jsx     # Target shooter
│   │   │   ├── MemoryGame.jsx      # Memory match
│   │   │   ├── MathGame.jsx        # Math race
│   │   │   ├── ReactionGame.jsx    # Reaction test
│   │   │   ├── SnakeGame.jsx       # Snake battle
│   │   │   └── TriviaGame.jsx      # Trivia quiz
│   │   ├── services/
│   │   │   ├── socket.js           # WebSocket client
│   │   │   └── wallet.js           # Wallet integration
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## 🌐 Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=production
SOFTKOIN_API_URL=https://softkoin.vercel.app/api
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (.env)
```env
VITE_BACKEND_URL=https://your-backend.onrender.com
VITE_WALLET_API_URL=https://softkoin.vercel.app/api
```

## 📈 Scaling

### Current Capacity (Free Tier)
- ~10 concurrent games (640 players)
- Render free tier (sleeps after 15 min)
- Vercel free tier (unlimited bandwidth)

### Production Ready ($7/month)
- ~50 concurrent games (3,200 players)
- Render Starter ($7/month)
- 24/7 uptime

### Large Scale ($100+/month)
- Multiple server instances
- Redis for session storage
- Load balancing
- 1000+ concurrent games

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 Roadmap

### Phase 1 ✅ (Current)
- [x] 8 game types
- [x] 64-player multiplayer
- [x] Real-time gameplay
- [x] Free tier

### Phase 2 🚧 (In Progress)
- [ ] Softkoin wallet integration
- [ ] Escrow payments
- [ ] Automatic payouts
- [ ] Transaction history

### Phase 3 📋 (Planned)
- [ ] Tournaments with brackets
- [ ] Private lobbies
- [ ] Player profiles & stats
- [ ] Achievements system
- [ ] Leaderboards

### Phase 4 🔮 (Future)
- [ ] Spectator mode
- [ ] Replay system
- [ ] Team-based games
- [ ] NFT rewards
- [ ] Mobile apps (iOS/Android)

## 🐛 Known Issues

- Render free tier sleeps after 15 minutes of inactivity
- Active games lost if server restarts (use paid tier for production)
- Maximum 64 players per game (by design)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Built with ❤️ by [Your Name]

## 🙏 Acknowledgments

- Inspired by traditional casino games and modern esports
- Built for the Softkoin ecosystem
- Special thanks to all beta testers

## 📞 Support

- GitHub Issues: [Report bugs](https://github.com/yourusername/casino-game-platform/issues)
- Documentation: [Full deployment guide](DEPLOYMENT.md)
- Email: your.email@example.com

---

**⚠️ Disclaimer**: This platform involves real money gambling. Users must be 18+ and comply with local gambling laws. The platform operator is not responsible for any losses. Gamble responsibly.
