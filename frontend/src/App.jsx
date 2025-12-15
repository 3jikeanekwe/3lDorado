import React, { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import walletService from './services/wallet';
import socketService from './services/socket';

function App() {
  const [wallet, setWallet] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [walletInput, setWalletInput] = useState('');

  useEffect(() => {
    // Check if wallet already connected
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
    setCurrentGame(null);
  };

  const handleJoinGame = (gameData) => {
    setCurrentGame(gameData);
  };

  const handleLeaveGame = () => {
    setCurrentGame(null);
  };

  if (!wallet) {
    return (
      
        
          
            🎮 64-Player Casino Games
          
          
            Connect your wallet to start playing multiplayer games and win prizes!
          
          
          
            
              Wallet Address
            
            <input
              type="text"
              placeholder="0x..."
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
          

          
            Connect Wallet
          

          
            How it works:
            
              Choose a game type and entry tier
              Wait for 64 players to join
              Compete in real-time multiplayer
              Top 10 players win prizes from the pool!
            
          
        
      
    );
  }

  return (
    
      
        
          🎮 64-Player Casino
          
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          
        
        
          Disconnect
        
      

      {currentGame ? (
        
      ) : (
        
      )}
    
  );
}

export default App;
