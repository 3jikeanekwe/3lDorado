import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';

export default function TriviaGame({ gameState, wallet }) {
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  useEffect(() => {
    socketService.on('action_result', (result) => {
      // Answer submitted
    });

    socketService.on('next_question', (newState) => {
      setAnswered(false);
      setSelectedAnswer(null);
    });

    return () => {
      socketService.off('action_result');
      socketService.off('next_question');
    };
  }, []);

  const handleAnswer = (answerIndex) => {
    if (answered) return;
    setAnswered(true);
    setSelectedAnswer(answerIndex);
    socketService.emit('game_action', { answerIndex });
  };

  const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
  const currentQuestion = gameState?.questions?.[gameState.currentQuestion];
  const topPlayers = [...(gameState?.players || [])]
    .sort((a, b) => b.score - a.score)
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
          <div className="stat-label">Streak</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {myPlayer?.streak || 0} 🔥
          </div>
        </div>
      </div>

      <div className="game-canvas">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            fontSize: '18px', 
            opacity: 0.8,
            marginBottom: '20px'
          }}>
            Question {(gameState?.currentQuestion || 0) + 1} / {gameState?.questions?.length}
          </div>

          <div style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            marginBottom: '40px',
            padding: '30px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {currentQuestion?.question || 'Loading...'}
          </div>

          <div style={{ 
            display: 'grid', 
            gap: '16px',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {currentQuestion?.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={answered}
                style={{
                  padding: '20px',
                  fontSize: '18px',
                  background: selectedAnswer === idx 
                    ? (idx === currentQuestion.correct ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                    : 'rgba(255,255,255,0.1)',
                  border: selectedAnswer === idx ? '2px solid' : '2px solid transparent',
                  borderColor: selectedAnswer === idx 
                    ? (idx === currentQuestion.correct ? '#34d399' : '#ef4444')
                    : 'transparent',
                  borderRadius: '12px',
                  cursor: answered ? 'default' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                className="secondary-btn"
              >
                {String.fromCharCode(65 + idx)}. {option}
              </button>
            ))}
          </div>
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '16px' }}>Leaderboard:</h3>
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
              <span style={{ fontWeight: 'bold' }}>🏆 {player.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
