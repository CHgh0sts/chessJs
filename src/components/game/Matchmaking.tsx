'use client';

import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Matchmaking() {
  const { user } = useAuth();
  const { connected, waitingForOpponent, findGame } = useSocket();

  const handleFindGame = () => {
    if (!connected) {
      alert('Connexion au serveur en cours...');
      return;
    }
    findGame();
  };

  if (waitingForOpponent) {
    return (
      <div className="text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Recherche d'un adversaire...</h2>
          <p className="text-gray-600 mb-4">Nous cherchons un joueur de votre niveau</p>
          <div className="text-sm text-gray-500">
            Cela peut prendre quelques secondes
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">♔ Chess Battle ♛</h1>
        <p className="text-gray-600 mb-8">Bienvenue {user?.username} !</p>
        
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-800 mb-2">Partie rapide</h3>
            <p className="text-blue-600 mb-4">10 minutes par joueur</p>
            <button
              onClick={handleFindGame}
              disabled={!connected}
              className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              {connected ? 'Trouver un adversaire' : 'Connexion...'}
            </button>
          </div>

          {/* Statistiques du joueur */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Vos statistiques</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{user?.rating}</div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{user?.gamesWon}</div>
                <div className="text-sm text-gray-600">Victoires</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{user?.gamesPlayed}</div>
                <div className="text-sm text-gray-600">Parties</div>
              </div>
            </div>
          </div>

          {/* Statut de connexion */}
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {connected ? 'Connecté au serveur' : 'Connexion au serveur...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
