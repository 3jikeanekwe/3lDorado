import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';

export default function MathGame({ gameState, wallet }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    socketService.on('action_result', (result) => {
      setFeedback(result.correct ? '✅ Correct!' : '❌ Wrong!');
      setAnswer('');
      setTimeout(() => setFeedback(null), 1000);
    });

    return () => socketService.off('action_result');
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer) return;
    socketService.emit('game_action', { answer });
  };

  const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
  const topPlayers = [...(gameState?.players || [])]
    .sort((a, b) => b.correct - a.correct)
    .slice(0, 5);

  return (
    <div>
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-label">Score</div>
          <div className="stat-value">{myPlayer?.score || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Correct</div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            {myPlayer?.correct || 0}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Incorrect</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {myPlayer?.incorrect || 0}
          </div>
        </div>
      </div>

      <div className="game-canvas">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            fontSize: '64px', 
            fontWeight: 'bold',
            marginBottom: '30px',
            padding: '30px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {gameState?.currentProblem?.question || 'Loading...'}
          </div>

          {feedback && (
            <div style={{ 
              fontSize: '32px', 
              marginBottom: '20px',
              fontWeight: 'bold',
              color: feedback.includes('✅') ? '#34d399' : '#ef4444'
            }}>
              {feedback}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ maxWidth: '300px', margin: '0 auto' }}>
            <input
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer..."
              style={{ 
                fontSize: '32px', 
                textAlign: 'center',
                marginBottom: '16px'
              }}
              autoFocus
            />
            <button 
              type="submit" 
              className="primary-btn"
              style={{ width: '100%', fontSize: '20px' }}
            >
              Submit Answer
            </button>
          </form>
        </div>

        <div style={{ 
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
              <span style={{ fontWeight: 'bold' }}>✅ {player.correct} correct</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
