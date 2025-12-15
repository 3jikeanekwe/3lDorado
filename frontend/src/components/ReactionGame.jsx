import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';

export default function ReactionGame({ gameState, wallet }) {
  const [lastReaction, setLastReaction] = useState(null);

  useEffect(() => {
    socketService.on('action_result', (result) => {
      if (result.hit && result.reactionTime) {
        setLastReaction(result.reactionTime);
        setTimeout(() => setLastReaction(null), 2000);
      }
    });

    return () => socketService.off('action_result');
  }, []);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    socketService.emit('game_action', { x, y });
  };

  const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
  const topPlayers = [...(gameState?.players || [])]
    .sort((a, b) => a.avgReactionTime - b.avgReactionTime)
    .filter(p => p.clicks > 0)
    .slice(0, 5);

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Score</div>
          <div className="stat-value">{myPlayer?.score || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Clicks</div>
          <div className="stat-value">{myPlayer?.clicks || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Avg Time</div>
          <div className="stat-value">
            {myPlayer?.avgReactionTime ? `${myPlayer.avgReactionTime.toFixed(0)}ms` : '-'}
          </div>
        </div>
      </div>

      <div className="game-canvas">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h3>Click the red target as fast as you can!</h3>
          {lastReaction && (
            <div style={{ 
              fontSize: '24px', 
              color: '#34d399',
              marginTop: '12px',
              fontWeight: 'bold'
            }}>
              ⚡ {lastReaction}ms
            </div>
          )}
        </div>

        <div 
          onClick={handleClick}
          style={{
            position: 'relative',
            width: '100%',
            height: '400px',
            background: 'radial-gradient(circle, #1e293b, #0f172a)',
            borderRadius: '16px',
            cursor: 'crosshair',
            overflow: 'hidden'
          }}
        >
          {gameState?.currentTarget && (
            <div
              className="target"
              style={{
                left: `${gameState.currentTarget.x}px`,
                top: `${gameState.currentTarget.y}px`,
                position: 'absolute',
                width: '60px',
                height: '60px',
                background: '#ef4444',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'pulse 0.5s infinite'
              }}
            />
          )}
        </div>

        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '16px' }}>Fastest Players:</h3>
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
              <span style={{ fontWeight: 'bold' }}>⚡ {player.avgReactionTime.toFixed(0)}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
