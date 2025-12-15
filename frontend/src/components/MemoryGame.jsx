import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';

export default function MemoryGame({ gameState, wallet }) {
  const [selectedCards, setSelectedCards] = useState([]);

  useEffect(() => {
    socketService.on('action_result', (result) => {
      if (result.match !== undefined) {
        setTimeout(() => setSelectedCards([]), result.match ? 0 : 1000);
      }
    });

    return () => socketService.off('action_result');
  }, []);

  const handleCardClick = (cardId) => {
    if (selectedCards.length >= 2) return;
    socketService.emit('game_action', { cardId });
    setSelectedCards([...selectedCards, cardId]);
  };

  const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
  const topPlayers = [...(gameState?.players || [])]
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 5);

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Score</div>
          <div className="stat-value">{myPlayer?.score || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Matches</div>
          <div className="stat-value">{myPlayer?.matches || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Attempts</div>
          <div className="stat-value">{myPlayer?.attempts || 0}</div>
        </div>
      </div>

      <div className="game-canvas">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {gameState?.cards.map(card => (
            <div
              key={card.id}
              onClick={() => !card.flipped && !card.matched && handleCardClick(card.id)}
              style={{
                aspectRatio: '1',
                background: card.flipped || card.matched 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                cursor: card.flipped || card.matched ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: card.matched ? 0.5 : 1
              }}
            >
              {(card.flipped || card.matched) ? card.emoji : '?'}
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '16px' }}>Top Players:</h3>
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
              <span style={{ fontWeight: 'bold' }}>🎴 {player.matches} matches</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
