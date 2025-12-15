import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';

export default function ShooterGame({ gameState, wallet }) {
  const [myScore, setMyScore] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    socketService.on('action_result', (result) => {
      if (result.hit) {
        setMyScore(result.score);
      }
    });

    return () => {
      socketService.off('action_result');
    };
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socketService.emit('game_action', {
      action: 'shoot',
      targetX: (x / rect.width) * 800,
      targetY: (y / rect.height) * 600
    });
  };

  const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
  const topPlayers = [...(gameState?.players || [])]
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Score</div>
          <div className="stat-value">{myScore}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Kills</div>
          <div className="stat-value">{myPlayer?.kills || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Targets Left</div>
          <div className="stat-value">{gameState?.targets.length || 0}</div>
        </div>
      </div>

      <div className="game-canvas">
        <div
          className="shooter-arena"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        >
          <div
            style={{
              position: 'absolute',
              left: mousePos.x,
              top: mousePos.y,
              width: '20px',
              height: '20px',
              border: '2px solid #34d399',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          />

          {gameState?.targets.map((target, idx) => (
            <div
              key={idx}
              className="target"
              style={{
                left: `${(target.x / 800) * 100}%`,
                top: `${(target.y / 600) * 100}%`
              }}
            />
          ))}

          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            padding: '12px 24px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            Click on the red targets to shoot!
          </div>
        </div>

        <div style={{ 
          marginTop: '20px', 
          padding: '20px', 
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '16px' }}>Top Shooters:</h3>
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
              <span style={{ fontWeight: 'bold' }}>🎯 {player.kills} kills</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
      }
