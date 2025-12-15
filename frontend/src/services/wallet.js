const WALLET_API_URL = import.meta.env.VITE_WALLET_API_URL || 'https://softkoin.vercel.app/api';

class WalletService {
  constructor() {
    this.currentWallet = this.loadWallet();
  }

  // Load wallet from localStorage
  loadWallet() {
    const saved = localStorage.getItem('wallet');
    return saved ? JSON.parse(saved) : null;
  }

  // Save wallet to localStorage
  saveWallet(wallet) {
    localStorage.setItem('wallet', JSON.stringify(wallet));
    this.currentWallet = wallet;
  }

  // Connect wallet
  async connectWallet(walletAddress) {
    try {
      // Validate wallet address format
      if (!walletAddress || walletAddress.length < 20) {
        throw new Error('Invalid wallet address');
      }

      const wallet = {
        address: walletAddress,
        connectedAt: new Date().toISOString()
      };

      this.saveWallet(wallet);
      return wallet;
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  // Get wallet balance
  async getBalance() {
    try {
      if (!this.currentWallet) {
        throw new Error('No wallet connected');
      }

      const response = await fetch(`${WALLET_API_URL}/balance/${this.currentWallet.address}`);
      const data = await response.json();
      return data.balance || 0;
    } catch (error) {
      console.error('Balance fetch error:', error);
      return 0;
    }
  }

  // Disconnect wallet
  disconnectWallet() {
    localStorage.removeItem('wallet');
    this.currentWallet = null;
  }

  // Check if wallet is connected
  isConnected() {
    return this.currentWallet !== null;
  }

  // Get current wallet
  getCurrentWallet() {
    return this.currentWallet;
  }
}

export default new WalletService();
