import React, { useState } from 'react';

const GAME_TYPES = [
  { id: 'typing', name: 'Speed Typing', icon: '⌨️', description: 'Type words faster than opponents', category: 'action' },
  { id: 'runner', name: 'Endless Runner', icon: '🏃', description: 'Jump and dodge obstacles', category: 'action' },
  { id: 'shooter', name: 'Target Shooter', icon: '🎯', description: 'Hit targets before others', category: 'action' },
  { id: 'memory', name: 'Memory Match', icon: '🎴', description: 'Match pairs faster than everyone', category: 'brain' },
  { id: 'math', name: 'Math Race', icon: '🔢', description: 'Solve equations lightning fast', category: 'brain' },
  { id: 'reaction', name: 'Reaction Test', icon: '⚡', description: 'Click targets with fastest reaction', category: 'brain' },
  { id: 'snake', name: 'Snake Battle', icon: '🐍', description: 'Grow longest without dying', category: 'adventure' },
  { id: 'trivia', name: 'Trivia Quiz', icon: '🧠', description: 'Answer questions correctly', category: 'brain' }
];

const TIERS = [
  { value: 0, label: 'FREE', color: '#10b981' },
  { value: 0.5, label: '$0.50', color: '#3b82f6' },
  { value: 1, label: '$1', color: '#6366f1' },
  { value: 2, label: '$2', color: '#8b5cf6' },
  { value: 5, label: '$5', color: '#a855f7' },
  { value: 10, label: '$10', color: '#d946ef' },
  { value: 25, label: '$25', color: '#ec4899' },
  { value: 50, label: '$50', color: '#f43f5e' },
  { value: 100, label: '$100', color: '#ef4444' }
];

export default function Lobby({ wallet, onJoinGame }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [username, setUsername] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleGameSelect = (gameType) => {
    setSelectedGame(gameType);
    setSelectedTier(null);
  };

  const handleJoin = () => {
    if (!selectedGame || selectedTier === null || !username) {
      alert('Please select a game, tier, and enter a username');
      return;
    }

    onJoinGame({
      gameType: selectedGame,
      tier: selectedTier,
      walletAddress: wallet.address,
      username
    });
  };

  if (!selectedGame) {
    const filteredGames = selectedCategory === 'all' 
      ? GAME_TYPES 
      : GAME_TYPES.filter(g => g.category === selectedCategory);

    return (
      <div>
        <h2 style={{ fontSize: '28px', marginBottom: '24px', textAlign: 'center' }}>
          Choose Your Game
        </h2>

        {/* Category Filter */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {['all', 'action', 'brain', 'adventure'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'primary-btn' : 'secondary-btn'}
              style={{ textTransform: 'capitalize' }}
            >
              {cat === 'all' ? '🎮 All Games' : 
               cat === 'action' ? '⚡ Action' :
               cat === 'brain' ? '🧠 Brain' : '🗺️ Adventure'}
            </button>
          ))}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredGames.map(game => (
            <div 
              key={game.id}
              className="game-card"
              onClick={() => handleGameSelect(game.id)}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{game.icon}</div>
              <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{game.name}</h3>
              <p style={{ opacity: 0.9, marginBottom: '8px' }}>{game.description}</p>
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.7,
                textTransform: 'uppercase',
                fontWeight: 600
              }}>
                {game.category}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const selectedGameInfo = GAME_TYPES.find(g => g.id === selectedGame);

  return (
    <div>
      <button 
        onClick={() => setSelectedGame(null)}
        className="secondary-btn"
        style={{ marginBottom: '20px' }}
      >
        ← Back to Games
      </button>

      <div className="card">
        <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>
          {selectedGameInfo.icon} {selectedGameInfo.name}
        </h2>
        <p style={{ opacity: 0.9, marginBottom: '24px' }}>
          {selectedGameInfo.description}
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Your Username
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
          />
        </div>

        <h3 style={{ marginBottom: '16px' }}>Select Entry Tier</h3>
        
        <div className="tier-grid">
          {TIERS.map(tier => (
            <div
              key={tier.value}
              className={`tier-card ${selectedTier === tier.value ? 'selected' : ''}`}
              onClick={() => setSelectedTier(tier.value)}
              style={{ borderColor: tier.color }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {tier.label}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {tier.value === 0 ? 'No Prize' : `Pool: ~$${(tier.value * 64 * 0.95).toFixed(0)}`}
              </div>
            </div>
          ))}
        </div>

        {selectedTier !== null && (
          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: 'rgba(52, 211, 153, 0.1)', 
            borderRadius: '8px',
            border: '2px solid #34d399'
          }}>
            <h4 style={{ marginBottom: '12px' }}>Prize Distribution:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '14px' }}>
              <div>🥇 1st: 40%</div>
              <div>🥈 2nd: 25%</div>
              <div>🥉 3rd: 15%</div>
              <div>🏅 4th-10th: 2.86% each</div>
            </div>
            {selectedTier > 0 && (
              <p style={{ marginTop: '12px', fontSize: '12px', opacity: 0.8 }}>
                Platform fee: 5% + 0.5% per player = ${((selectedTier * 64 * 0.05) + (64 * selectedTier * 0.005)).toFixed(2)}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleJoin}
          className="primary-btn"
          style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '18px' }}
          disabled={selectedTier === null || !username}
        >
          Join Lobby - {selectedTier === 0 ? 'FREE' : `$${selectedTier}`}
        </button>
      </div>
    </div>
  );
}
