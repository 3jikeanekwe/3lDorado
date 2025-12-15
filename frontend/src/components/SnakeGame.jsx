import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';

export default function SnakeGame({ gameState, wallet }) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
      };
      
      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        socketService.emit('game_action', { direction });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
  const topPlayers = [...(gameState?.players || [])]
    .sort((a, b) => b.foodEaten - a.foodEaten)
    .slice(0, 5);

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Score</div>
          <div className="stat-value">{myPlayer?.score || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Food Eaten</div>
          <div className="stat-value">{myPlayer?.foodEaten || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Status</div>
          <div className="stat-value">
            {myPlayer?.isEliminated ? '💀' : '🐍'}
          </div>
        </div>
      </div>

      <div className="game-canvas">
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h3>Use Arrow Keys to Move</h3>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
            <button onClick={() => socketService.emit('game_action', { direction: 'up' })} className="secondary-btn">↑</button>
            <button onClick={() => socketService.emit('game_action', { direction: 'down' })} className="secondary-btn">↓</button>
            <button onClick={() => socketService.emit('game_action', { direction: 'left' })} className="secondary-btn">←</button>
            <button onClick={() => socketService.emit('game_action', { direction: 'right' })} className="secondary-btn">→</button>
          </div>
        </div>

        <div style={{
          position: 'relative',
          width: '800px',
          height: '600px',
          maxWidth: '100%',
          aspectRatio: '4/3',
          background: '#0f172a',
          borderRadius: '16px',
          margin: '0 auto',
          overflow: 'hidden'
        }}>
          {/* Food */}
          {gameState?.food && (
            <div style={{
              position: 'absolute',
              left: `${gameState.food.x}px`,
              top: `${gameState.food.y}px`,
              width: '20px',
              height: '20px',
              background: '#ef4444',
              borderRadius: '50%'
            }} />
          )}

          {/* My Snake */}
          {myPlayer?.snake?.map((segment, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${segment.x}px`,
                top: `${segment.y}px`,
                width: '18px',
                height: '18px',
                background: idx === 0 ? '#34d399' : '#22c55e',
                borderRadius: idx === 0 ? '50%' : '4px',
                border: '1px solid #0f172a'
              }}
            />
          ))}
        </div>

        <div style={{ 
          marginTop: '20px', 
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
              <span style={{ fontWeight: 'bold' }}>🍎 {player.foodEaten} food</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
