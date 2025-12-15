// File: frontend/src/App.jsx - TOURNAMENT VERSION

import React, { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import TournamentRoom from './components/TournamentRoom';
import walletService from './services/wallet';
import socketService from './services/socket';

function App() {
  const [wallet, setWallet] = useState(null);
  const [currentTournament, setCurrentTournament] = useState(null);
  const [walletInput, setWalletInput] = useState('');

  useEffect(() => {
    const savedWallet = walletService.getCurrentWallet();
    if (savedWallet) {
      setWallet(savedWallet);
      socketService.connect();
    }
  }, []);

  const handleConnectWallet = async () => {
    try {
      const connected = await walletService.connectWallet(walletInput);
      setWallet(connected);
      socketService.connect();
      alert('Wallet connected successfully!');
    } catch (error) {
      alert('Error connecting wallet: ' + error.message);
    }
  };

  const handleDisconnect = () => {
    walletService.disconnectWallet();
    socketService.disconnect();
    setWallet(null);
    setCurrentTournament(null);
  };

  const handleJoinTournament = (gameData) => {
    setCurrentTournament(gameData);
  };

  const handleLeaveTournament = () => {
    setCurrentTournament(null);
  };

  if (!wallet) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div className="card" style={{ maxWidth: '600px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '40px', marginBottom: '12px' }}>
              🏆 64-Player Tournament Casino
            </h1>
            <p style={{ fontSize: '18px', opacity: 0.9 }}>
              3 Rounds. 8 Winners. Winner Takes All.
            </p>
          </div>

          <div style={{ marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>How It Works:</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '2px solid #ef4444' }}>
                <strong>🔴 Round 1: The Purge</strong><br/>
                64 players → Bottom 32 eliminated
              </div>
              <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '2px solid #f59e0b' }}>
                <strong>🟠 Round 2: The Filter</strong><br/>
                32 players → Bottom 24 eliminated
              </div>
              <div style={{ padding: '12px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '2px solid #34d399' }}>
                <strong>🟢 Round 3: Money Round</strong><br/>
                Final 8 compete for prizes!
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Connect Your Wallet
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
          </div>

          <button 
            onClick={handleConnectWallet}
            className="primary-btn"
            style={{ width: '100%', fontSize: '18px', padding: '16px' }}
            disabled={!walletInput}
          >
            Connect & Play
          </button>

          <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,215,0,0.1)', borderRadius: '8px', border: '2px solid #ffd700' }}>
            <h3 style={{ marginBottom: '12px', textAlign: 'center' }}>💰 Prize Distribution</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '14px' }}>
              <div>🥇 1st: 40% (24x ROI)</div>
              <div>🥈 2nd: 20% (12x ROI)</div>
              <div>🥉 3rd: 10% (6x ROI)</div>
              <div>4th: 8% (4.8x ROI)</div>
              <div>5th: 5.5% (3.3x ROI)</div>
              <div>6th: 5.5% (3.3x ROI)</div>
              <div>7th: 5.5% (3.3x ROI)</div>
              <div>8th: 5.5% (3.3x ROI)</div>
            </div>
            <p style={{ marginTop: '12px', fontSize: '12px', opacity: 0.8, textAlign: 'center' }}>
              Total distributed: 100% of net pot (after 5% + 0.5% per player fees)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header style={{ 
        padding: '16px 24px', 
        background: 'rgba(0,0,0,0.2)', 
        borderRadius: '16px', 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>
            🏆 64-Player Tournament Casino
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>
        <button onClick={handleDisconnect} className="danger-btn">
          Disconnect
        </button>
      </header>

      {currentTournament ? (
        <TournamentRoom 
          gameData={currentTournament}
          wallet={wallet}
          onLeave={handleLeaveTournament}
        />
      ) : (
        <Lobby 
          wallet={wallet}
          onJoinGame={handleJoinTournament}
        />
      )}
    </div>
  );
}

export default App;
