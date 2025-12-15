import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';

export default function RunnerGame({ gameState, wallet }) {
  const [myDistance, setMyDistance] = useState(0);

  useEffect(() => {
    socketService.on('action_result', (result) => {
      if (result.distance !== undefined) {
        setMyDistance(result.distance);
      }
    });

    const handleKeyPress = (e) => {
      let action = null;
      if (e.key === 'ArrowUp' || e.key === ' ') action = 'jump';
      if (e.key === 'ArrowDown') action = 'duck';
      
      if (action) {
        e.preventDefault();
        socketService.emit('game_action', { action });
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      socketService.off('action_result');
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
  const trackProgress = (myDistance / gameState?.trackLength) * 100;

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Distance</div>
          <div className="stat-value">{myDistance}m</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Progress</div>
          <div className="stat-value">{trackProgress.toFixed(0)}%</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Status</div>
          <div className="stat-value">
            {myPlayer?.isEliminated ? '❌' : '✅'}
          </div>
        </div>
      </div>

      <div className="game-canvas">
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h3>Controls:</h3>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px' }}>
            <button 
              onClick={() => socketService.emit('game_action', { action: 'jump' })}
              className="primary-btn"
            >
              ⬆️ Jump (↑ or Space)
            </button>
            <button 
              onClick={() => socketService.emit('game_action', { action: 'duck' })}
              className="primary-btn"
            >
              ⬇️ Duck (↓)
            </button>
          </div>
        </div>

        <div className="runner-track">
          <div 
            className="runner-player"
            style={{ 
              left: `${trackProgress}%`,
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />

          {gameState?.obstacles
            .filter(obs => Math.abs(obs.position - myDistance) < 200)
            .map((obs, idx) => (
              <div
                key={idx}
                className="obstacle"
                style={{
                  left: `${((obs.position - myDistance + 200) / 400) * 100}%`,
                  bottom: obs.type === 'low' ? '0px' : 'auto',
                  top: obs.type === 'high' ? '0px' : 'auto'
                }}
              />
            ))}
        </div>

        <div style={{ 
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px'
        }}>
          <h4>Active Players: {gameState?.players.filter(p => !p.isEliminated).length} / {gameState?.players.length}</h4>
        </div>
      </div>
    </div>
  );
          }
