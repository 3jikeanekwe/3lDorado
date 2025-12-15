// File: frontend/src/components/TournamentRoom.jsx

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

export default function TournamentRoom({ gameData, wallet, onLeave }) {
  const [roomState, setRoomState] = useState('waiting'); // waiting, countdown, playing, round_break, finished
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundName, setRoundName] = useState('');
  const [survivorsNeeded, setSurvivorsNeeded] = useState(0);
  const [roundResults, setRoundResults] = useState(null);
  const [finalWinners, setFinalWinners] = useState([]);
  const [totalPot, setTotalPot] = useState(0);
  const [netPot, setNetPot] = useState(0);
  const [prizes, setPrizes] = useState({});

  useEffect(() => {
    socketService.emit('join_tournament', gameData);

    // Tournament joined
    socketService.on('tournament_joined', (data) => {
      setPlayers(data.players);
      setTotalPot(data.totalPot);
      setNetPot(data.netPot);
    });

    // Tournament updated
    socketService.on('tournament_updated', (data) => {
      setPlayers(data.players);
      setTotalPot(data.totalPot);
      setNetPot(data.netPot);
    });

    // Tournament starting
    socketService.on('tournament_starting', (data) => {
      setRoomState('countdown');
      setTotalPot(data.totalPot);
      setNetPot(data.netPot);
      setPrizes(data.prizes);
      
      let timeLeft = Math.floor(data.countdown / 1000);
      setCountdown(timeLeft);
      
      const timer = setInterval(() => {
        timeLeft--;
        setCountdown(timeLeft);
        if (timeLeft <= 0) clearInterval(timer);
      }, 1000);
    });

    // Round started
    socketService.on('round_started', (data) => {
      setRoomState('playing');
      setCurrentRound(data.roundNumber);
      setRoundName(data.roundName);
      setSurvivorsNeeded(data.survivorsNeeded);
      setGameState(data.gameState);
      setRoundResults(null);
    });

    // Game state update
    socketService.on('game_state_update', (data) => {
      setGameState(data);
    });

    // Round ended
    socketService.on('round_ended', (data) => {
      setRoomState('round_break');
      setRoundResults(data);
    });

    // Next round countdown
    socketService.on('next_round_countdown', (data) => {
      let timeLeft = data.countdown;
      setCountdown(timeLeft);
      
      const timer = setInterval(() => {
        timeLeft--;
        setCountdown(timeLeft);
        if (timeLeft <= 0) clearInterval(timer);
      }, 1000);
    });

    // Tournament completed
    socketService.on('tournament_completed', (data) => {
      setRoomState('finished');
      setFinalWinners(data.winners);
      setTotalPot(data.totalPot);
      setNetPot(data.netPot);
    });

    return () => {
      socketService.off('tournament_joined');
      socketService.off('tournament_updated');
      socketService.off('tournament_starting');
      socketService.off('round_started');
      socketService.off('game_state_update');
      socketService.off('round_ended');
      socketService.off('next_round_countdown');
      socketService.off('tournament_completed');
    };
  }, [gameData]);

  const handleLeave = () => {
    socketService.emit('leave_tournament');
    onLeave();
  };

  // WAITING LOBBY
  if (roomState === 'waiting') {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px' }}>🏆 Tournament Lobby</h2>
          <button onClick={handleLeave} className="danger-btn">Leave</button>
        </div>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          padding: '20px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#34d399' }}>
              {players.length}/64
            </div>
            <div style={{ opacity: 0.8 }}>Players</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#f59e0b' }}>
              3
            </div>
            <div style={{ opacity: 0.8 }}>Rounds</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#ef4444' }}>
              ${gameData.tier}
            </div>
            <div style={{ opacity: 0.8 }}>Entry Fee</div>
          </div>
        </div>

        {/* Tournament Structure */}
        <div style={{ 
          padding: '20px', 
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '16px' }}>🎯 Tournament Structure</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '2px solid #ef4444' }}>
              <strong>Round 1: The Purge</strong> - 64 → 32 players (Bottom 32 eliminated)
            </div>
            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '2px solid #f59e0b' }}>
              <strong>Round 2: The Filter</strong> - 32 → 8 players (Bottom 24 eliminated)
            </div>
            <div style={{ padding: '12px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '2px solid #34d399' }}>
              <strong>Round 3: Money Round</strong> - Final 8 compete for prizes!
            </div>
          </div>
        </div>

        {/* Prize Pool */}
        {totalPot > 0 && (
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
            borderRadius: '12px',
            border: '2px solid #667eea',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginBottom: '16px' }}>💰 Prize Pool</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: '#34d399' }}>
              ${netPot.toFixed(2)}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              Total collected: ${totalPot.toFixed(2)}
            </div>
          </div>
        )}

        {/* Players Grid */}
        <h3 style={{ marginBottom: '16px' }}>Players ({players.length}/64):</h3>
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

  // COUNTDOWN
  if (roomState === 'countdown') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>🏆 Tournament Starting!</h2>
        <div className="countdown">{countdown}s</div>
        <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '12px' }}>Prize Distribution (Final 8):</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '14px' }}>
            <div>🥇 1st: ${prizes[1]?.amount.toFixed(2)} (40%)</div>
            <div>🥈 2nd: ${prizes[2]?.amount.toFixed(2)} (20%)</div>
            <div>🥉 3rd: ${prizes[3]?.amount.toFixed(2)} (10%)</div>
            <div>4th: ${prizes[4]?.amount.toFixed(2)} (8%)</div>
            <div>5th: ${prizes[5]?.amount.toFixed(2)} (5.5%)</div>
            <div>6th: ${prizes[6]?.amount.toFixed(2)} (5.5%)</div>
            <div>7th: ${prizes[7]?.amount.toFixed(2)} (5.5%)</div>
            <div>8th: ${prizes[8]?.amount.toFixed(2)} (5.5%)</div>
          </div>
        </div>
      </div>
    );
  }

  // PLAYING ROUND
  if (roomState === 'playing') {
    const myPlayer = gameState?.players.find(p => p.walletAddress === wallet.address);
    const isEliminated = myPlayer?.isEliminated;

    return (
      <div>
        {/* Round Header */}
        <div style={{ 
          padding: '20px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '28px', marginBottom: '4px' }}>
                Round {currentRound}: {roundName}
              </h2>
              <p style={{ opacity: 0.8 }}>
                {gameState?.players.filter(p => !p.isEliminated).length} players remaining
              </p>
            </div>
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.2)', 
              padding: '8px 16px', 
              borderRadius: '8px',
              border: '2px solid #ef4444',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                Top {survivorsNeeded}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Survive</div>
            </div>
          </div>

          {isEliminated && (
            <div style={{ 
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              border: '2px solid #ef4444',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>❌ You've Been Eliminated</div>
              <div>Watch the remaining players compete!</div>
            </div>
          )}
        </div>

        {/* Game Component */}
        {!isEliminated && (
          <>
            {gameData.gameType === 'typing' && <TypingGame gameState={gameState} wallet={wallet} />}
            {gameData.gameType === 'runner' && <RunnerGame gameState={gameState} wallet={wallet} />}
            {gameData.gameType === 'shooter' && <ShooterGame gameState={gameState} wallet={wallet} />}
            {gameData.gameType === 'memory' && <MemoryGame gameState={gameState} wallet={wallet} />}
            {gameData.gameType === 'math' && <MathGame gameState={gameState} wallet={wallet} />}
            {gameData.gameType === 'reaction' && <ReactionGame gameState={gameState} wallet={wallet} />}
            {gameData.gameType === 'snake' && <SnakeGame gameState={gameState} wallet={wallet} />}
            {gameData.gameType === 'trivia' && <TriviaGame gameState={gameState} wallet={wallet} />}
          </>
        )}

        {/* Live Standings */}
        {isEliminated && gameState && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Live Standings:</h3>
            <div className="leaderboard">
              {[...gameState.players]
                .sort((a, b) => b.score - a.score)
                .map((player, idx) => (
                  <div key={idx} className="leaderboard-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={`rank-badge ${idx < 3 ? `rank-${idx + 1}` : 'rank-other'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{player.username}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>
                          {player.isEliminated ? '💀 Eliminated' : '✅ Alive'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                      {player.score} pts
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ROUND BREAK
  if (roomState === 'round_break') {
    const myResult = roundResults?.results.find(r => r.walletAddress === wallet.address);
    const survived = myResult?.survived;

    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>
          Round {currentRound} Complete!
        </h2>

        {/* My Result */}
        <div style={{ 
          padding: '30px',
          background: survived 
            ? 'rgba(52, 211, 153, 0.2)' 
            : 'rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          border: survived ? '2px solid #34d399' : '2px solid #ef4444',
          marginBottom: '30px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {survived ? '✅ YOU SURVIVED!' : '❌ ELIMINATED'}
          </div>
          <div style={{ fontSize: '24px' }}>
            Rank: #{myResult?.rank} - Score: {myResult?.score}
          </div>
        </div>

        {/* Round Results */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>Round Results:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#34d399' }}>
                {roundResults?.survivors.length}
              </div>
              <div>✅ Survived</div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
                {roundResults?.eliminated.length}
              </div>
              <div>❌ Eliminated</div>
            </div>
          </div>
        </div>

        {/* Next Round Countdown */}
        {survived && currentRound < 3 && countdown && (
          <div>
            <h3 style={{ marginBottom: '12px' }}>Next Round Starting In:</h3>
            <div className="countdown">{countdown}s</div>
          </div>
        )}

        {!survived && (
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <p>Thank you for playing! Better luck next time.</p>
            <button onClick={onLeave} className="primary-btn" style={{ marginTop: '16px' }}>
              Back to Lobby
            </button>
          </div>
        )}
      </div>
    );
  }

  // TOURNAMENT FINISHED
  if (roomState === 'finished') {
    const myWin = finalWinners.find(w => w.walletAddress === wallet.address);

    return (
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '36px', marginBottom: '16px' }}>
            🏆 Tournament Complete!
          </h2>
          {myWin && (
            <div style={{ 
              padding: '30px',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 193, 7, 0.2))',
              borderRadius: '16px',
              border: '3px solid #ffd700',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                {myWin.rank === 1 ? '🥇' : myWin.rank === 2 ? '🥈' : myWin.rank === 3 ? '🥉' : '🏅'}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                {myWin.rank === 1 ? 'CHAMPION!' : `${myWin.rank}${myWin.rank === 2 ? 'nd' : myWin.rank === 3 ? 'rd' : 'th'} Place`}
              </div>
              <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#34d399' }}>
                ${myWin.prize.toFixed(2)}
              </div>
              <div style={{ fontSize: '18px', opacity: 0.8, marginTop: '8px' }}>
                {myWin.roi}x ROI!
              </div>
            </div>
          )}
        </div>

        {/* Final Rankings */}
        <div className="leaderboard">
          <h3 style={{ marginBottom: '16px' }}>Final 8 Winners:</h3>
          {finalWinners.map((winner, idx) => (
            <div 
              key={idx}
              className="leaderboard-item"
              style={{ 
                background: winner.walletAddress === wallet.address 
                  ? 'rgba(52, 211, 153, 0.2)' 
                  : 'rgba(255,255,255,0.05)',
                border: winner.walletAddress === wallet.address 
                  ? '2px solid #34d399' 
                  : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={`rank-badge ${
                  winner.rank === 1 ? 'rank-1' : 
                  winner.rank === 2 ? 'rank-2' : 
                  winner.rank === 3 ? 'rank-3' : 'rank-other'
                }`}>
                  {winner.rank}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{winner.username}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {winner.totalScore} pts
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#34d399' }}>
                  ${winner.prize.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  {winner.roi}x
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onLeave}
          className="primary-btn"
          style={{ width: '100%', marginTop: '24px' }}
        >
          Play Another Tournament
        </button>
      </div>
    );
  }

  return null;
                         }
