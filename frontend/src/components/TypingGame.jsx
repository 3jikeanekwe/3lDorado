import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';

export default function TypingGame({ gameState, wallet }) {
  const [input, setInput] = useState('');
  const [myScore, setMyScore] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();

    socketService.on('action_result', (result) => {
      if (result.success) {
        setMyScore(result.score);
        setInput('');
      }
    });

    return () => {
      socketService.off('action_result');
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    socketService.emit('game_action', {
      input: input.trim()
    });
  };

  const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
  const topPlayers = [...(gameState?.players || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Your Score</div>
          <div className="stat-value">{myScore}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Words Typed</div>
          <div className="stat-value">{myPlayer?.wordsTyped || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Accuracy</div>
          <div className="stat-value">{myPlayer?.accuracy || 100}%</div>
        </div>
      </div>

      <div className="game-canvas">
        <div className="typing-word">
          {gameState?.currentWord || 'Loading...'}
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type the word..."
            style={{ 
              fontSize: '24px', 
              textAlign: 'center',
              maxWidth: '400px',
              margin: '0 auto'
            }}
            autoComplete="off"
          />
        </form>

        <div style={{ 
          marginTop: '40px', 
          padding: '20px', 
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '16px' }}>Top 5 Players:</h3>
          {topPlayers.map((player, idx) => (
            <div 
              key={idx}
              style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                marginBottom: '8px',
                background: player.walletAddress === wallet.address 
                  ? 'rgba(52, 211, 153, 0.2)' 
                  : 'rgba(255,255,255,0.05)',
                borderRadius: '8px'
              }}
            >
              <span>#{idx + 1} {player.username}</span>
              <span style={{ fontWeight: 'bold' }}>{player.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
