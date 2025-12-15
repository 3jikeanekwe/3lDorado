import React, { useState, useEffect } from 'react';
import socketService from '../services/socket';
import TypingGame from './TypingGame';
import RunnerGame from './RunnerGame';
import ShooterGame from './ShooterGame';
import MemoryGame from './MemoryGame';
import MathGame from './MathGame';
import ReactionGame from './ReactionGame';
import SnakeGame from './SnakeGame';
import TriviaGame from './TriviaGame';

export default function GameRoom({ gameData, wallet, onLeave }) {
  const [roomState, setRoomState] = useState('waiting');
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    socketService.emit('join_lobby', gameData);

    socketService.on('lobby_joined', (data) => {
      setPlayers(data.players);
    });

    socketService.on('lobby_updated', (data) => {
      setPlayers(data.players);
    });

    socketService.on('game_starting', (data) => {
      setRoomState('countdown');
      let timeLeft = Math.floor(data.countdown / 1000);
      setCountdown(timeLeft);
      
      const timer = setInterval(() => {
        timeLeft--;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
        }
      }, 1000);
    });

    socketService.on('game_started', (data) => {
      setRoomState('playing');
      setGameState(data.gameState);
    });

    socketService.on('game_state_update', (data) => {
      setGameState(data);
    });

    socketService.on('game_ended', (data) => {
      setRoomState('finished');
      setRankings(data.rankings);
    });

    return () => {
      socketService.off('lobby_joined');
      socketService.off('lobby_updated');
      socketService.off('game_starting');
      socketService.off('game_started');
      socketService.off('game_state_update');
      socketService.off('game_ended');
    };
  }, [gameData]);

  const handleLeave = () => {
    socketService.emit('leave_lobby');
    onLeave();
  };

  if (roomState === 'waiting') {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px' }}>Waiting for Players...</h2>
          <button onClick={handleLeave} className="danger-btn">
            Leave Lobby
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '20px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
              {players.length} / 64
            </div>
            <div style={{ opacity: 0.8 }}>Players</div>
          </div>
          <div style={{ 
            width: '200px', 
            height: '200px', 
            border: '8px solid rgba(255,255,255,0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '8px solid #34d399',
              clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((players.length / 64) * 2 * Math.PI)}% ${50 - 50 * Math.cos((players.length / 64) * 2 * Math.PI)}%, 100% 100%, 0% 100%)`,
              transform: 'rotate(-90deg)'
            }} />
            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {Math.round((players.length / 64) * 100)}%
            </span>
          </div>
        </div>

        <h3 style={{ marginBottom: '16px' }}>Players in Lobby:</h3>
        <div className="player-grid">
          {players.map((player, idx) => (
            <div key={idx} className="player-card">
              <div className="player-avatar">
                {player.username?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{player.username}</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  {player.walletAddress.slice(0, 6)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (roomState === 'countdown') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>Game Starting Soon!</h2>
        <div className="countdown">{countdown}s</div>
        <p style={{ fontSize: '18px', opacity: 0.9 }}>Get ready...</p>
      </div>
    );
  }

  if (roomState === 'playing') {
    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '24px' }}>Game in Progress</h2>
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.2)', 
            padding: '8px 16px', 
            borderRadius: '8px',
            border: '2px solid #ef4444'
          }}>
            🔴 LIVE
          </div>
        </div>

        {gameData.gameType === 'typing' && <TypingGame gameState={gameState} wallet={wallet} />}
        {gameData.gameType === 'runner' && <RunnerGame gameState={gameState} wallet={wallet} />}
        {gameData.gameType === 'shooter' && <ShooterGame gameState={gameState} wallet={wallet} />}
        {gameData.gameType === 'memory' && <MemoryGame gameState={gameState} wallet={wallet} />}
        {gameData.gameType === 'math' && <MathGame gameState={gameState} wallet={wallet} />}
        {gameData.gameType === 'reaction' && <ReactionGame gameState={gameState} wallet={wallet} />}
        {gameData.gameType === 'snake' && <SnakeGame gameState={gameState} wallet={wallet} />}
        {gameData.gameType === 'trivia' && <TriviaGame gameState={gameState} wallet={wallet} />}
      </div>
    );
  }

  if (roomState === 'finished') {
    const myRanking = rankings.find(r => r.walletAddress === wallet.address);
    const isWinner = myRanking && myRanking.rank <= 10;

    return (
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '16px' }}>
            {isWinner ? '🎉 Congratulations!' : 'Game Over'}
          </h2>
          {isWinner && (
            <p style={{ fontSize: '24px', color: '#34d399' }}>
              You finished #{myRanking.rank}!
            </p>
          )}
        </div>

        <div className="leaderboard">
          <h3 style={{ marginBottom: '16px' }}>Final Rankings:</h3>
          {rankings.map((player, idx) => (
            <div 
              key={idx} 
              className="leaderboard-item"
              style={{ 
                background: player.walletAddress === wallet.address 
                  ? 'rgba(52, 211, 153, 0.2)' 
                  : 'rgba(255,255,255,0.05)',
                border: player.walletAddress === wallet.address 
                  ? '2px solid #34d399' 
                  : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={`rank-badge ${
                  player.rank === 1 ? 'rank-1' : 
                  player.rank === 2 ? 'rank-2' : 
                  player.rank === 3 ? 'rank-3' : 'rank-other'
                }`}>
                  {player.rank}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{player.username}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {player.walletAddress.slice(0, 6)}...
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                {player.score} pts
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onLeave}
          className="primary-btn"
          style={{ width: '100%', marginTop: '24px' }}
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  return null;
        }
